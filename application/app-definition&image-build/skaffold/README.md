# Skaffold

## 安装

```bash
# Linux
$ curl -Lo skaffold https://storage.googleapis.com/skaffold/releases/latest/skaffold-linux-amd64 && chmod +x skaffold && sudo mv skaffold /usr/local/bin
```

验证：

```bash
$ skaffold version
v0.5.0
```

## 入门

```bash
$ git clone https://github.com/GoogleCloudPlatform/skaffold

$ cd skaffold/examples/getting-started/

$ tree .
├── Dockerfile
├── k8s-pod.yaml
├── main.go
└── skaffold.yaml
```

* main.go

```golang
package main

import (
    "fmt"
    "time"
)

func main() {
    for {
        fmt.Println("Hello world!")
        time.Sleep(time.Second * 1)
    }
}
```

* Dockerfile

```Dockerfile
FROM golang:1.10.1-alpine3.7 as builder
COPY main.go .
RUN go build -o /app main.go

FROM alpine:3.7
CMD ["./app"]
```

```bash
$ docker build -f Dockerfile -t dockerce/skaffold-exmaple:latest .
$ docker build -f Dockerfile -t dockerce/skaffold-exmaple:v0.5.0 .
$ docker build -f Dockerfile -t dockerce/skaffold-exmaple:v0.4.0 .
```

* k8s-pod.yaml

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: getting-started
spec:
  containers:
  - name: getting-started
    image: gcr.io/k8s-skaffold/skaffold-example # 改成 dockerce/skaffold-example
```
