const express = require('express');
const cors = require('cors');

const jwt = require('jsonwebtoken');

// dotenv 
require('dotenv').config();

const port = process.env.PORT || 5000;

const app = express();

// middleware 

app.use(cors());
app.use(express.json());



// connecting 

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.akihfew.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// verifying jwt --middleware(creating custom middleware)
function verifyJWT(req, res, next) {
    // console.log('bookings', req.headers.authorization);
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorized access')
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' });
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {
    try {
        const appointmentOptionsCollection = client.db('doctorsPortal').collection('appointmentOption');
        // this collection is for booking 
        const bookingCollection = client.db('doctorsPortal').collection('bookings');
        // This collection is for users 
        const usersCollection = client.db('doctorsPortal').collection('users');


        // this is not the best practice.. use aggregate to query multiple collection and then merge data 
        app.get('/appointmentOptions', async (req, res) => {
            const date = req.query.date;
            // console.log(date);
            const query = {};

            // get the bookings of the provided date 

            const bookingQuery = { appointmentDate: date }
            const options = await appointmentOptionsCollection.find(query).toArray();

            // checking booked data 
            const alreadyBooked = await bookingCollection.find(bookingQuery).toArray();


            // code carefully 
            options.forEach(option => {
                // console.log(option);
                const optionBooked = alreadyBooked.filter(book => book.treatment === option.name)
                // console.log(optionBooked);
                const bookedSlot = optionBooked.map(book => book.slot);
                const remainingSlot = option.slots.filter(slot => !bookedSlot.includes(slot));
                option.slots = remainingSlot;
                // console.log(date, option.name, bookedSlot, remainingSlot.length);
            })

            res.send(options)
        })

        // posting data to backend 

        // getting booking datas 
        app.get('/bookings', verifyJWT, async (req, res) => {
            const email = req.query.email;
            // console.log(email);
            // console.log('bookings', req.headers.authorization);
            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const query = { email: email };
            const bookings = await bookingCollection.find(query).toArray();
            res.send(bookings);
        })

        app.post('/bookings', async (req, res) => {
            const bookings = req.body;
            // console.log(bookings);
            const query = {
                appointmentDate: bookings.appointmentDate,
                treatment: bookings.treatment,
                email: bookings.email
            }

            const alreadyBooked = await bookingCollection.find(query).toArray();
            if (alreadyBooked.length) {
                const message = `you already have a booking on ${bookings.appointmentDate}`;
                return res.send({ acknowleged: false, message });
            }

            const results = await bookingCollection.insertOne(bookings);
            res.send(results);
        });

        // jwt part 
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1h' });
                return res.send({ accessToken: token })
            }


            // console.log(user);
            res.status(403).send({ accessToken: '' })
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result)
        })
    }
    finally {

    }
}
run().catch(error => console.error(error))




app.get('/', (req, res) => {
    res.send('Doctors portal running');
})

app.listen(port, () => {
    console.log('running on port - ', port);
})