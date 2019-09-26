# Prometheus 2.x

Prometheus 是 SoundCloud 开源的一个监控系统。继 Kubernetes 之后，加入了 [CNCF](https://www.cncf.io)。

## 特征和组件

Prometheus 特点：集成了 `主动抓取`、`存储`、`查询`、`图标展示` 和 `告警` 功能。

监控方式：Prometheus 通过 HTTP 方式拉取目标服务的 metrics 指标，因此被监控的服务只需要通过 HTTP 路径提供 metrics 指标，再由 Prometheus 将目标服务的 metrics 地址添加到配置中。除了监控其他服务外，Prometheus 自身也提供了 metrics 数据来监控自己的监控状态。

### 数据模型

Prometheus 的时间序列格式：`<metric_name>{<label_name>=<label_value>, ...}`，例如：

```
api_http_requests_total{method="POST", handler="/messages"}
```

## 术语

* Alert（告警）
* Alertmanager（告警管理器）
* Bridge（网桥）
* Client library（客户库）
* Collector（收集器）


## Prometheus vs. InfluxDB

InfluxDB 的优点：

  * 使用事件日志
  * 商业版本提供的集群方案，对于长期的时间序列存储是非常不错的
  * 复制的数据最终一致性

Prometheus 的优点：

  * 主要做度量指标监控
  * 更强大的查询语言，警告和通知功能
  * 图表和警告的高可靠性和稳定性


## metric 类型

* 计数器（Counter）

计数器是一个递增的值，主要用于统计服务的请求数、任务完成数、错误出现的次数等。

* 计量器（Gauge）

计量器是一个既可以递增又可以递减的值，主要用于计量温度、内存使用量等。

* 直方图（Histogram）

* Summary

## Job、Instance

多个 instance 的集合称为一个 job，一个 instance 可以绘制一条线。

例如，kube-apiservers 有三个相同的实例：

* job: kube-apiservers
  * instance1: 192.168.10.80:8080
  * instance2: 192.168.10.81:8080
  * instance3: 192.168.10.82:8080



## 安装、运行、配置

### 安装

```bash
# 主机安装
$ ops/prometheus/install-prometheus.sh
```

### 配置

```yaml
# 全局配置
global:
  scrape_interval:     15s # 每 15 秒抓取一次 metrics 数据，默认一分钟
  evaluation_interval: 15s # 每 15 秒评估一次规则，默认一分钟
  # scrape_timeout 抓取 metrics 数据的超时时间

# Alertmanager 配置
alerting:
  alertmanagers:
  - static_configs:
    - targets:
      # - alertmanager:9093

# 加载规则一次，并根据全局的 'evaluation_interval' 参数定期评估这些规则
rule_files:
  # - "first_rules.yml"
  # - "second_rules.yml"

# scrape（抓取）配置
scrape_configs:
  # Job 名称将作为 label （job=<job_name>）被添加到从该配置抓取到的所有时间序列当中
  - job_name: 'prometheus'

    # metircs 的路径默认是 '/metrics'
    # scheme 默认是 'http'
    static_configs:
      - targets: ['localhost:9090']
```

更多详细的配置，可以查看[官方配置](https://prometheus.io/docs/prometheus/latest/configuration/configuration/)

### 运行

```bash
# 主机运行
$ prometheus --web.listen-address="0.0.0.0:9090" --config.file="prometheus.yml"

# Docker 运行
$ docker run -itd --name=prometheus -p 9090:9090 prom/prometheus:v2.0.0
```

运行后相关链接：

  * http://localhost:9090
  * http://localhost:9090/metrics
  * http://localhost:9090/targets


## 管理

### 数据库

### 增删改查

```bash
$ wget -O prometheus-config.yaml https://github.com/prometheus/prometheus/raw/v2.0.0/documentation/examples/prometheus-kubernetes.yml
```


如何动态渲染配置？


## 部署

### RBAC

```bash
$ cat <<EOF > prometheus-rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: prometheus
  namespace: monitoring
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: prometheus
rules:
- apiGroups: [""]
  resources:
  - nodes
  - nodes/proxy
  - services
  - endpoints
  - pods
  verbs: ["get", "list", "watch"]
- nonResourceURLs: ["/metrics"]
  verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: prometheus
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: prometheus
subjects:
- kind: ServiceAccount
  name: prometheus
  namespace: monitoring
EOF
```

```bash
# 创建命名空间
$ kubectl create namespace monitoring

$ kubectl apply -f prometheus-rbac.yaml
```

### 部署

```bash
# 需要确保 dns
$ sed -i "s|localhost:9090|prometheus.monitoring.svc.cluster.local:9090|g" prometheus-cm.yaml

$ kubectl apply -f prometheus-cm.yaml
$ kubectl apply -f prometheus.yaml
```

### prometheus.yaml

```yaml
apiVersion: apps/v1beta2
kind: Deployment
metadata:
  name: prometheus
  labels:
    k8s-app: prometheus
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      k8s-app: prometheus
  template:
    metadata:
      labels:
        k8s-app: prometheus
    spec:
      serviceAccountName: prometheus
      containers:
      - image: prom/prometheus:v2.0.0
        name: prometheus
        command:
        - "/bin/prometheus"
        args:
        - "--config.file=/etc/prometheus/prometheus.yml"
        - "--storage.tsdb.path=/prometheus"
        - "--storage.tsdb.retention=15d"
        ports:
        - name: http
          containerPort: 9090
          protocol: TCP
        volumeMounts:
        - name: data
          mountPath: "/prometheus"
          subPath: prometheus/data
        - name: config
          mountPath: "/etc/prometheus"
        resources:
          requests:
            cpu: 200m
            memory: 500Mi
          limits:
            cpu: 500m
            memory: 1Gi
      volumes:
      - name: data
        emptyDir: {}
      - name: config
        configMap:
          name: prometheus-config
---
apiVersion: v1
kind: Service
metadata:
  name: prometheus
  labels:
    k8s-app: prometheus
  namespace: monitoring
spec:
  type: ClusterIP
  selector:
    k8s-app: prometheus
  ports:
  - name: web
    port: 9090
    targetPort: http
```

### prometheus-cm.yaml

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 30s
      scrape_timeout: 30s
    scrape_configs:
    - job_name: 'prometheus'
      static_configs:
        - targets: ['prometheus.monitoring.svc.cluster.local:9090']
    - job_name: 'kubernetes-apiservers'
      kubernetes_sd_configs:
      - role: endpoints
      scheme: https
      tls_config:
        ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
      bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
      relabel_configs:
      - source_labels: [__meta_kubernetes_namespace, __meta_kubernetes_service_name, __meta_kubernetes_endpoint_port_name]
        action: keep
        regex: default;kubernetes;https
    - job_name: 'kubernetes-nodes'
      scheme: https
      tls_config:
        ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
      bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
      kubernetes_sd_configs:
      - role: node
      relabel_configs:
      - action: labelmap
        regex: __meta_kubernetes_node_label_(.+)
      - target_label: __address__
        replacement: kubernetes.default.svc:443
      - source_labels: [__meta_kubernetes_node_name]
        regex: (.+)
        target_label: __metrics_path__
        replacement: /api/v1/nodes/${1}/proxy/metrics
    - job_name: 'kubernetes-cadvisor'
      scheme: https
      tls_config:
        ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
      bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
      kubernetes_sd_configs:
      - role: node
      relabel_configs:
      - action: labelmap
        regex: __meta_kubernetes_node_label_(.+)
      - target_label: __address__
        replacement: kubernetes.default.svc:443
      - source_labels: [__meta_kubernetes_node_name]
        regex: (.+)
        target_label: __metrics_path__
        replacement: /api/v1/nodes/${1}/proxy/metrics/cadvisor
    - job_name: 'kubernetes-node-exporter'
      scheme: http
      tls_config:
        ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
      bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
      kubernetes_sd_configs:
      - role: node
      relabel_configs:
      - action: labelmap
        regex: __meta_kubernetes_node_label_(.+)
      - source_labels: [__meta_kubernetes_role]
        action: replace
        target_label: kubernetes_role
      - source_labels: [__address__]
        regex: '(.*):10250'
        replacement: '${1}:31672'
        target_label: __address__
    - job_name: 'kubernetes-service-endpoints'
      kubernetes_sd_configs:
      - role: endpoints
      relabel_configs:
      - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_scheme]
        action: replace
        target_label: __scheme__
        regex: (https?)
      - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      - source_labels: [__address__, __meta_kubernetes_service_annotation_prometheus_io_port]
        action: replace
        target_label: __address__
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
      - action: labelmap
        regex: __meta_kubernetes_service_label_(.+)
      - source_labels: [__meta_kubernetes_namespace]
        action: replace
        target_label: kubernetes_namespace
      - source_labels: [__meta_kubernetes_service_name]
        action: replace
        target_label: kubernetes_name
    - job_name: 'kubernetes-services'
      metrics_path: /probe
      params:
        module: [http_2xx]
      kubernetes_sd_configs:
      - role: service
      relabel_configs:
      - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_probe]
        action: keep
        regex: true
      - source_labels: [__address__]
        target_label: __param_target
      - target_label: __address__
        replacement: blackbox-exporter.example.com:9115
      - source_labels: [__param_target]
        target_label: instance
      - action: labelmap
        regex: __meta_kubernetes_service_label_(.+)
      - source_labels: [__meta_kubernetes_namespace]
        target_label: kubernetes_namespace
      - source_labels: [__meta_kubernetes_service_name]
        target_label: kubernetes_name
```

### node-exporter.yaml

```yaml
apiVersion: apps/v1beta2
kind: DaemonSet
metadata:
  name: node-exporter
  labels:
    k8s-app: node-exporter
  namespace: monitoring
spec:
  selector:
    matchLabels:
      k8s-app: node-exporter
  template:
    metadata:
      labels:
        k8s-app: node-exporter
    spec:
      tolerations:
      - key: "node-role.kubernetes.io"
        value: "master"
        effect: "NoSchedule"
      containers:
      - name: node-exporter
        image: prom/node-exporter:v0.15.2
        ports:
        - name: http
          containerPort: 9100
          protocol: TCP
---
apiVersion: v1
kind: Service
metadata:
  name: node-exporter
  namespace: monitoring
spec:
  type: NodePort
  selector:
    k8s-app: node-exporter
  ports:
  - name: endpoint
    port: 9100
    targetPort: 9100
    nodePort: 31672
```


## 参考

* [prometheus/alertmanager](https://github.com/prometheus/alertmanager)
* [prometheus-kubernetes.yml](https://github.com/prometheus/prometheus/blob/v2.0.0/documentation/examples/prometheus-kubernetes.yml)
* [Prometheus in Kubernetes](https://github.com/kubernetes/contrib/tree/master/prometheus)
* [Kubernetes 下升级 Prometheus 2.0](https://blog.qikqiak.com/post/update-prometheus-2-in-kubernetes/)
* [Prometheus 非官方中文手册](https://github.com/1046102779/prometheus)
* [Kubernetes 使用 Prometheus 搭建监控平台](https://blog.qikqiak.com/post/kubernetes-monitor-prometheus-grafana/)
* [Kubernetes 下升级 Prometheus 2.0](https://blog.qikqiak.com/post/update-prometheus-2-in-kubernetes/)

> http://blog.csdn.net/liyingke112/article/details/78018371

> https://github.com/coreos/prometheus-operator/tree/master/contrib/kube-prometheus/manifests/grafana

> https://blog.qikqiak.com/post/update-prometheus-2-in-kubernetes/

> https://github.com/kubernetes/kube-state-metrics



* [kubernetes+ prometheus自动伸缩的设计与实现(一)](http://blog.csdn.net/u010278923/article/details/78894652)


* [Prometheus charts](https://github.com/kubernetes/charts/tree/master/stable/prometheus)
* [最佳实践 | Prometheus在Kubernetes下的监控实践](http://www.dockone.io/article/2579)
