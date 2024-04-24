const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors(
    {
        origin:["http://localhost:5173"],
        credentials:true
    }
));
app.use(express.json());
app.use(cookieParser())

const verifyToken = async (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).send({ message: "unothorized access" })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: "unothorized access" });
        }
        console.log(decoded)
        req.user = decoded;
        next();
    })
}



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_KEY}@cluster0.4vd9ngi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,

    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        // get the database and collection on which operation will run

        const serviceCollection = client.db('carMechanics').collection('services');
        const bookingsCollection = client.db('carMechanics').collection('bookings');

        // auth related api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{expiresIn:'1h'});
            
            res
            .cookie('token',token,{
                httpOnly:true,
                secure:false
            })
            .send({message:"success"})
        })

        app.post('/logout', async(req,res)=>{
            const user = req.body;
            res.clearCookie('token',{maxAge:0}).send({message:"success"})
        })
        app.get('/services', async (req, res) => {
            const cursor = serviceCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })

        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const options = {
                projection: { title: 1, price: 1, img: 1 }
            }
            const result = await serviceCollection.findOne(query, options);
            res.send(result);
        })

        // booking api
        app.post('/bookings', async (req, res) => {
            const bookedService = req.body;

            const result = await bookingsCollection.insertOne(bookedService);
            res.send(result);

        })

        app.get('/bookings', verifyToken, async (req, res) => {
            const userEmail = req.query.email;
            console.log("from bokkings", req.cookies.token);
            if (req.query.email !== req.user?.email) {
                return res.status(403).send({ message: "forbidden access" });
            }
            console.log(req.query)
            console.log("token", req.cookies.token)
            console.log(userEmail);
            let query = {};
            if (userEmail) {
                query = { email: userEmail }
            }
            console.log(query)

            const result = await bookingsCollection.find(query).toArray();
            res.send(result);
        })

        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('mechanic is coming');
})

app.listen(port, () => {
    console.log(`mechanic is running on port ${port}`);
})