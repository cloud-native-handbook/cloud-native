# Heapster

## 部署 Heapster

### 修改配置

```bash
$ HEAPSTER_BASE_PATH=https://raw.githubusercontent.com/kubernetes/heapster/v1.5.0/deploy/kube-config

$ wget -O grafana.yaml $HEAPSTER_BASE_PATH/influxdb/grafana.yaml
$ wget -O influxdb.yaml $HEAPSTER_BASE_PATH/influxdb/influxdb.yaml
$ wget -O heapster.yaml $HEAPSTER_BASE_PATH/influxdb/heapster.yaml
$ wget -O heapster-rbac.yaml $HEAPSTER_BASE_PATH/rbac/heapster-rbac.yaml
```

```bash
# 修改镜像源
$ sed -i "s|gcr.io/google_containers|dockerce|g" grafana.yaml
$ sed -i "s|gcr.io/google_containers|dockerce|g" influxdb.yaml
$ sed -i "s|gcr.io/google_containers|dockerce|g" heapster.yaml
```

* 修改命名空间

如果不想修改命名空间，可以省略以下操作。另外需要注意的是 Heapster 必须和 Kubernetes Dashboard 在同一命名空间（默认是 `kube-system` 命名空间）。

```bash
# 创建命名空间
$ kubectl create namespace monitoring

# 修改命名空间（heapster 不修改，与 kubernetes-dashboard 都在 kube-system 命名空间）
$ sed -i "s|kube-system|monitoring|g" grafana.yaml
$ sed -i "s|kube-system|monitoring|g" influxdb.yaml
```

```bash
# 修改名称
$ sed -i "s|monitoring-grafana|grafana|g" grafana.yaml
$ sed -i "s|monitoring-influxdb|influxdb|g" grafana.yaml
$ sed -i "s|monitoring-influxdb|influxdb|g" influxdb.yaml

# Heapster 需要修改 influxdb 的地址
$ sed -i "s|monitoring-influxdb.kube-system.svc|influxdb.monitoring.svc|g" heapster.yaml

# 还需要为 grafana.yaml 增加一个环境变量
# env:
# - name: INFLUXDB_PORT
#   value: "8086"
```

### RBAC

```bash
# 修改 RBAC apiVersion
$ sed -i "s|rbac.authorization.k8s.io/v1beta1|rbac.authorization.k8s.io/v1|g" heapster-rbac.yaml
```

kube-apiserver 运行的时候系统自动创建了一个 `system:heapster` ClusterRole：

```bash
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: system:heapster
  ...
rules:
- apiGroups:
  - ""
  resources:
  - events
  - namespaces
  - nodes
  - pods
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - extensions
  resources:
  - deployments
  verbs:
  - get
  - list
  - watch
```

### 部署

```bash
$ kubectl apply -f grafana.yaml
$ kubectl apply -f influxdb.yaml
$ kubectl apply -f heapster-rbac.yaml
$ kubectl apply -f heapster.yaml
```

```bash
# 检查 Grafana、Influxdb
$ kubectl -n monitoring get pod
NAME                        READY     STATUS    RESTARTS   AGE
grafana-578ff7fb7c-gf9lq    1/1       Running   0          9m
influxdb-6786888fd7-9kdl6   1/1       Running   0          9m

# 检查 Heapster
$ kubectl -n kube-system get pod -l k8s-app=heapster
NAME                       READY     STATUS    RESTARTS   AGE
heapster-9db4f45bf-6pxgh   1/1       Running   0          10m

# 排查日志
$ kubectl -n monitoring logs -f grafana-7cf4586ccd-hs2s7
$ kubectl -n monitoring logs -f influxdb-6786888fd7-9qb5b
$ kubectl -n kube-system logs -f heapster-9db4f45bf-6pxgh
```

部署好 Heapster 一段时间后，可以执行 `kubectl top` 命令查看监控：

```bash
$ kubectl top pod
NAME                    CPU(cores)   MEMORY(bytes)
nginx-85bf588b8-4fndc   0m           2Mi
nginx-85bf588b8-mxxnl   0m           2Mi
nginx-85bf588b8-46rx2   0m           2Mi

$ kubectl top node
NAME             CPU(cores)   CPU%      MEMORY(bytes)   MEMORY%
kube-master-80   207m         1%        3591Mi          11%
kube-master-81   247m         1%        4221Mi          13%
kube-master-82   193m         1%        3593Mi          11%
kube-node-100    13832m       43%       12464Mi         4%
```

除此之外，可以通过浏览器查看 Kubernetes Dashboard 是否已经增加了图表（`https://kubernetes-dashboard.kube-system.svc.cluster.local`）， 以及通过 `http://grafana.monitoring.svc.cluster.local` 查看监控。另外，Heapster 收集到的信息是存储在 Influxdb 的 `k8s` Database 中的，监控数据默认保留 7 天，Influxdb 的默认用户名/密码是 `root/root`。

>  注意：Influxdb、Grafana 的数据并没有持久化，当 Pod 重新调度后数据可能会丢失；

### grafana.yaml 原文件

增加了一个环境变量 `INFLUXDB_PORT`。

```yaml
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: monitoring-grafana
  namespace: kube-system
spec:
  replicas: 1
  template:
    metadata:
      labels:
        task: monitoring
        k8s-app: grafana
    spec:
      containers:
      - name: grafana
        image: gcr.io/google_containers/heapster-grafana-amd64:v4.4.3
        ports:
        - containerPort: 3000
          protocol: TCP
        volumeMounts:
        - mountPath: /etc/ssl/certs
          name: ca-certificates
          readOnly: true
        - mountPath: /var
          name: grafana-storage
        env:
        - name: INFLUXDB_HOST
          value: monitoring-influxdb
        - name: INFLUXDB_PORT
          value: "8086"
        - name: GF_SERVER_HTTP_PORT
          value: "3000"
          # The following env variables are required to make Grafana accessible via
          # the kubernetes api-server proxy. On production clusters, we recommend
          # removing these env variables, setup auth for grafana, and expose the grafana
          # service using a LoadBalancer or a public IP.
        - name: GF_AUTH_BASIC_ENABLED
          value: "false"
        - name: GF_AUTH_ANONYMOUS_ENABLED
          value: "true"
        - name: GF_AUTH_ANONYMOUS_ORG_ROLE
          value: Admin
        - name: GF_SERVER_ROOT_URL
          # If you're only using the API Server proxy, set this value instead:
          # value: /api/v1/namespaces/kube-system/services/monitoring-grafana/proxy
          value: /
      volumes:
      - name: ca-certificates
        hostPath:
          path: /etc/ssl/certs
      - name: grafana-storage
        emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  labels:
    # For use as a Cluster add-on (https://github.com/kubernetes/kubernetes/tree/master/cluster/addons)
    # If you are NOT using this as an addon, you should comment out this line.
    kubernetes.io/cluster-service: 'true'
    kubernetes.io/name: monitoring-grafana
  name: monitoring-grafana
  namespace: kube-system
spec:
  # In a production setup, we recommend accessing Grafana through an external Loadbalancer
  # or through a public IP.
  # type: LoadBalancer
  # You could also use NodePort to expose the service at a randomly-generated port
  # type: NodePort
  ports:
  - port: 80
    targetPort: 3000
  selector:
    k8s-app: grafana
```

### influxdb.yaml 原文件

```yaml
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: monitoring-influxdb
  namespace: kube-system
spec:
  replicas: 1
  template:
    metadata:
      labels:
        task: monitoring
        k8s-app: influxdb
    spec:
      containers:
      - name: influxdb
        image: gcr.io/google_containers/heapster-influxdb-amd64:v1.3.3
        volumeMounts:
        - mountPath: /data
          name: influxdb-storage
      volumes:
      - name: influxdb-storage
        emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  labels:
    task: monitoring
    # For use as a Cluster add-on (https://github.com/kubernetes/kubernetes/tree/master/cluster/addons)
    # If you are NOT using this as an addon, you should comment out this line.
    kubernetes.io/cluster-service: 'true'
    kubernetes.io/name: monitoring-influxdb
  name: monitoring-influxdb
  namespace: kube-system
spec:
  ports:
  - port: 8086
    targetPort: 8086
  selector:
    k8s-app: influxdb
```

### heapster-rbac.yaml 原文件

```yaml
kind: ClusterRoleBinding
apiVersion: rbac.authorization.k8s.io/v1beta1
metadata:
  name: heapster
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: system:heapster
subjects:
- kind: ServiceAccount
  name: heapster
namespace: kube-system
```

### heapster.yaml 原文件

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: heapster
  namespace: kube-system
---
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: heapster
  namespace: kube-system
spec:
  replicas: 1
  template:
    metadata:
      labels:
        task: monitoring
        k8s-app: heapster
    spec:
      serviceAccountName: heapster
      containers:
      - name: heapster
        image: gcr.io/google_containers/heapster-amd64:v1.4.2
        imagePullPolicy: IfNotPresent
        command:
        - /heapster
        - --source=kubernetes:https://kubernetes.default
        - --sink=influxdb:http://monitoring-influxdb.kube-system.svc:8086
---
apiVersion: v1
kind: Service
metadata:
  labels:
    task: monitoring
    # For use as a Cluster add-on (https://github.com/kubernetes/kubernetes/tree/master/cluster/addons)
    # If you are NOT using this as an addon, you should comment out this line.
    kubernetes.io/cluster-service: 'true'
    kubernetes.io/name: Heapster
  name: heapster
  namespace: kube-system
spec:
  ports:
  - port: 80
    targetPort: 8082
  selector:
    k8s-app: heapster
```

参数参考：

```bash
/heapster --metric-resolution=30s --sink=influxdb:http://influxdb.default:8086?db=heapster&user=heapster&pw=PASSWORD
```

## 参考

* [Run Heapster in a Kubernetes cluster with an InfluxDB backend and a Grafana UI](https://github.com/kubernetes/heapster/blob/master/docs/influxdb.md)
