const http = require('http');
const connect = require('connect');
const bodyParser = require('body-parser');
const compression = require('compression');
const errorhandler = require('errorhandler')
const morgan = require('morgan');
const casual = require('casual');
const fs = require('fs');
const Mustache = require('mustache');

const template = fs.readFileSync(`${__dirname}/production.template.mustache`, 'utf8');

const acceptEventStream = (req) => {
    return req.headers.accept && req.headers.accept === 'text/event-stream';
}

const constructSSE = () => {
    var id = (new Date()).toLocaleTimeString();
    const body = [
        `id: ${id}`,
        `data: ${casual.city}`,
    ]
    return body.join('\n');
}

const sendSSE = (req, res) => {
    console.log('>>>>>> sending SSE response');

    // setup basic headers
    res.writeHeader(200, {
        'X-Sample-Test': 'foo',
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',

        // enabling CORS
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
    });

    // compose the message
    // const initialResponse = constructSSE();
    const initialId = (new Date()).toLocaleTimeString();
    res.write('id: ' + initialId + '\n');
    res.write('event: ' + 'add' + '\n');
    res.write("data: " + casual.city + '\n\n');

    // send message every second and a half
    setInterval(function () {
        const nextId = (new Date()).toLocaleTimeString();
        res.write('id: ' + nextId + '\n');
        res.write('event: ' + 'add' + '\n');
        res.write("data: " + casual.city + '\n\n');
    }, 2000);
}

const handleSSE = (req, res, next) => {
    if (!acceptEventStream(req)) {
        return res.end('Answer only to event stream requests');
    } else {
        return sendSSE(req, res)
    }
    next();
}

const handleApp = (req, res, next) => {
    if (req.url === '/') {
        return res.end(Mustache.render(template, {}));
    }
    next();
}

const app = connect();

// register middlewares
app.use(compression());
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));
app.use(bodyParser.urlencoded({extended: true}));
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
});

// register routes
app.use('/', handleApp);
app.use('/sse', handleSSE);

if (process.env.NODE_ENV === 'development') {
    // only use in development
    app.use(errorhandler())
}

http.createServer(app).listen(3000);
console.log(`==> Application is listening on localhost:3000`);