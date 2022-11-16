const express = require('express');
const cors = require('cors');

const port = process.env.PORT || 5000;

const app = express();

// middleware 

app.use(cors());
app.use(express.json());



// connecting 

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://<username>:<password>@cluster0.akihfew.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });




app.get('/', (req, res) => {
    res.send('Doctors portal running');
})

app.listen(port, () => {
    console.log('running on port - ', port);
})