# Linkerd


## 部署


### 本地运行

本地运行 linkerd，必须事先安装 Java 8。

```bash
$ java -version
java version "1.8.0_161"
Java(TM) SE Runtime Environment (build 1.8.0_161-b12)
Java HotSpot(TM) 64-Bit Server VM (build 25.161-b12, mixed mode)
```

* 下载安装

```bash
$ LINKERD_VER=1.3.6
$ wget https://github.com/linkerd/linkerd/releases/download/${LINKERD_VER}/linkerd-${LINKERD_VER}.tgz
$ tar -zxvf linkerd-${LINKERD_VER}.tgz && cd linkerd-${LINKERD_VER}
```

* 运行

```bash
$ ./linkerd-${LINKERD_VER}-exec config/linkerd.yaml
```

### Docker 运行



### Kubernetes 运行



> https://raw.githubusercontent.com/linkerd/linkerd-examples/master/k8s-daemonset/k8s/linkerd.yml

```yaml
# runs linkerd in a daemonset, in linker-to-linker mode
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: l5d-config
data:
  config.yaml: |-
    admin:
      ip: 0.0.0.0
      port: 9990

    namers:
    - kind: io.l5d.k8s
      host: localhost
      port: 8001

    telemetry:
    - kind: io.l5d.prometheus
    - kind: io.l5d.recentRequests
      sampleRate: 0.25

    usage:
      orgId: linkerd-examples-daemonset

    routers:
    - protocol: http
      label: outgoing
      dtab: |
        /srv        => /#/io.l5d.k8s/default/http;
        /host       => /srv;
        /svc        => /host;
        /host/world => /srv/world-v1;
      interpreter:
        kind: default
        transformers:
        - kind: io.l5d.k8s.daemonset
          namespace: default
          port: incoming
          service: l5d
      servers:
      - port: 4140
        ip: 0.0.0.0
      service:
        responseClassifier:
          kind: io.l5d.http.retryableRead5XX

    - protocol: http
      label: incoming
      dtab: |
        /srv        => /#/io.l5d.k8s/default/http;
        /host       => /srv;
        /svc        => /host;
        /host/world => /srv/world-v1;
      interpreter:
        kind: default
        transformers:
        - kind: io.l5d.k8s.localnode
      servers:
      - port: 4141
        ip: 0.0.0.0
---
apiVersion: extensions/v1beta1
kind: DaemonSet
metadata:
  labels:
    app: l5d
  name: l5d
spec:
  template:
    metadata:
      labels:
        app: l5d
    spec:
      volumes:
      - name: l5d-config
        configMap:
          name: "l5d-config"
      containers:
      - name: l5d
        image: buoyantio/linkerd:1.3.6
        env:
        - name: POD_IP
          valueFrom:
            fieldRef:
              fieldPath: status.podIP
        args:
        - /io.buoyant/linkerd/config/config.yaml
        ports:
        - name: outgoing
          containerPort: 4140
          hostPort: 4140
        - name: incoming
          containerPort: 4141
        - name: admin
          containerPort: 9990
        volumeMounts:
        - name: "l5d-config"
          mountPath: "/io.buoyant/linkerd/config"
          readOnly: true

      - name: kubectl
        image: buoyantio/kubectl:v1.8.5
        args:
        - "proxy"
        - "-p"
        - "8001"
---
apiVersion: v1
kind: Service
metadata:
  name: l5d
spec:
  selector:
    app: l5d
  type: LoadBalancer
  ports:
  - name: outgoing
    port: 4140
  - name: incoming
    port: 4141
  - name: admin
    port: 9990
```



https://linkerd.io


https://www.kubernetes.org.cn/2796.html
