# Dockerfile 构建镜像示例

## server.js

```js
var http = require('http');

var handleRequest = function(request, response) {
  console.log('Received request for URL: ' + request.url);
  response.writeHead(200);
  response.end('Hello World!');
};
var www = http.createServer(handleRequest);
www.listen(8080);
```

## Dockerfile

```dockerfile
FROM node:6.14.2
EXPOSE 8080
COPY server.js .
CMD node server.js
```

## 构建镜像

```sh
$ docker build -t hello-node:latest -f Dockerfile ./
```
