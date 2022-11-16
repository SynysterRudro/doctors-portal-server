const express = require('express');
const cors = require('cors');

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

async function run() {
    try {
        const appointmentOptionsCollection = client.db('doctorsPortal').collection('appointmentOption');
        // this collection is for booking 
        const bookingCollection = client.db('doctorsPortal').collection('bookings');


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