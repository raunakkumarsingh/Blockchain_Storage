const express=require('express')
const cors=require('cors')

const app=express()


port=process.env.PORT || 5000

app.use(express.json())
app.use(cors())

app.use('/api',require('./Routes/upload'))

app.get('/',(req,res)=>{
   console.log("hello World");
})




app.listen(port,()=>{
    console.log(`listening on port http://localhost:${port}`)
})

