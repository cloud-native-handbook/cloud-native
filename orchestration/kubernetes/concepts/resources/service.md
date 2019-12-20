# Service

Service 是一个 4 层的负载均衡。

## 类型

* NodePort
* ClusterIP
* ...

## Service 类型

### ClusterIP

* 有 clusterIP

* Healess Service

`spec.clusterIP=None`。访问 headless service 只能通过环境变量（如：MYSQL_SERVICE_HOST）或者 DNS（如：mysql.default.svc.cluster.local），通过这两种方式将直接得到 selector 获取的所有 pod 列表，但不会通过 kube-proxy 实现负载均衡，而是应该自定义负载均衡策略。

分析：

  - Headless Service 同样会创建 Endpoints，访问 Headless Service 实际上是通过 Endpoints 将流量负载到了 Pod 上。
  - 直接访问 Pod：`<pod-name>.<headless-service>.<namesapce>.svc.cluster.local`
  - ingress-nginx 同样支持代理 headless service（http/https/tcp/udp 都支持），实际上 ingress-nginx 和 Headless Service 一样都不会经过 kube-proxy 实现负载，而是将流量直接传达到 Pod。

* 无 selector

```yaml
# Service 不指定 selector，而是自定义 Endpoints。Service 和 Endpoints 需要同名
apiVersion: v1
kind: Service
metadata:
  name: my-service
  labels:
    app: myService
  namespace: default
spec:
  type: ClusterIP
  ports:
  - name: web-port
    port: 8888
    targetPort: 9376
    protocol: TCP
---
apiVersion: v1
kind: Endpoints
metadata:
  name: my-service
  labels:
    name: myService
subsets:
  - addresses:
    - ip: 1.2.3.4
    ports:
    - port: 9376
```

### NodePort

NodePort 类型的 Service 的默认端口范围：`30000-32767`，可以通过修改 `kube-apiserver` 的启动参数 `--service-node-port-range` 来改变。

### LoadBalancer

type=LoadBalancer 时必须指定 clusterIP。

## ExternalName

Maps the service to the contents of the externalName field (e.g. foo.bar.example.com), by returning a CNAME record with its value. No proxying of any kind is set up. This requires version 1.7 or higher of kube-dns.

https://github.com/kubernetes/website/issues/5822
https://akomljen.com/kubernetes-tips-part-1/

## 负载均衡策略

* RoundRobin

轮询模式。

* SessionAffinity

基于客户端 IP 进行会话保留。service.spec.sessionAffinity 默认值为 `None`，设置为 `ClientIP` 可以启用 SessionAffinity 策略。


## 添加 Service 作为集群插件

通常需要在 `metadata.labels` 中添加两个标签： `kubernetes.io/cluster-service: "true"`、 `kubernetes.io/name: "your-addon-name"`，设置后可以通过 `https://<master-ip>:6443/api/v1/proxy/namespaces/kube-system/services/<your-addon-name>` 来访问该服务。

```yaml
apiVersion: v1
kind: Service
metadata:
  name: kube-registry
  namespace: kube-system
  labels:
    k8s-app: kube-registry-upstream
    kubernetes.io/cluster-service: "true"
    kubernetes.io/name: "KubeRegistry"
    addonmanager.kubernetes.io/mode: Reconcile
spec:
  selector:
    k8s-app: kube-registry-upstream
  ports:
  - name: registry
    port: 5000
    protocol: TCP
```

```bash
$ kubectl cluster-info
Kubernetes master is running at https://192.168.10.100:6443
Heapster is running at https://192.168.10.100:6443/api/v1/proxy/namespaces/kube-system/services/heapster
KubeDNS is running at https://192.168.10.100:6443/api/v1/proxy/namespaces/kube-system/services/kube-dns
monitoring-grafana is running at https://192.168.10.100:6443/api/v1/proxy/namespaces/kube-system/services/monitoring-grafana
monitoring-influxdb is running at https://192.168.10.100:6443/api/v1/proxy/namespaces/kube-system/services/monitoring-influxdb
```

# Kubernetes Service

Kubernetes 在设计之初就充分考虑了针对容器的服务发现与负载均衡机制，提供了 Service 资源，并通过 kube-proxy 配合 cloud provider 来适应不同的应用场景。

kubernetes中的负载均衡大致可以分为以下几种机制：

  * Service：直接用 Service 提供 cluster 内部的负载均衡，并借助 cloud provider 提供的 LB 提供外部访问；
  * Ingress Controller：还是用 Service 提供 cluster 内部的负载均衡，但是通过自定义 LB 提供外部访问；
  * Service Load Balancer：把 load balancer 直接跑在容器中，实现 Bare Metal 的 Service Load Balancer；
  * Custom Load Balancer：自定义负载均衡，并替代 kube-proxy，一般在物理部署 Kubernetes 时使用，方便接入公司已有的外部服务。


## Service

Service 是对一组提供相同功能的 Pods 的抽象，并为它们提供一个统一的入口。借助 Service，应用可以方便的实现服务发现与负载均衡，并实现应用的零宕机升级。Service 通过标签来选取服务后端，一般配合 Replication Controller 或者 Deployment 来保证后端容器的正常运行。这些匹配标签的 Pod IP 和端口列表组成 endpoints，由 kube-proxy 负责将 Service IP 负载均衡到这些 endpoints 上。

Service 有四种类型：

  * ClusterIP：默认类型，自动分配一个仅 cluster 内部可以访问的虚拟 IP；
  * NodePort：在 ClusterIP 基础上为 Service 在每台机器上绑定一个端口，这样就可以通过 <NodeIP>:NodePort 来访问该服务；
  * LoadBalancer：在 NodePort 的基础上，借助 cloud provider 创建一个外部的负载均衡器，并将请求转发到 <NodeIP>:NodePort；
  * ExternalName：将服务通过 DNS CNAME 记录方式转发到指定的域名（通过spec.externlName设定）。需要 kube-dns 版本在 1.7 以上。


## Service 定义

```yaml
# k8s-nginx-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx
  labels:
    run: nginx
  namespace: default
spec:
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
  selector:
    run: nginx
  sessionAffinity: None
  type: ClusterIP
```

```bash
$ # 创建 service
$ kubectl create -f k8s-nginx-service.yaml
$
$ # 为 service 分配了 ClusterIP
$ kubectl get services nginx
NAME      CLUSTER-IP    EXTERNAL-IP   PORT(S)   AGE
nginx     10.254.71.4   <none>        80/TCP    6m
$
$ # 自动创建的 endpoint
$ kubectl get endpoints nginx
NAME      ENDPOINTS       AGE
nginx     10.20.58.2:80   7m
$
$ # service 自动关联 endpoint
$ kubectl describe service nginx
Name:     nginx
Namespace:    default
Labels:     run=nginx
Selector:   app=nginx
Type:     ClusterIP
IP:     10.254.71.4
Port:     <unset> 80/TCP
Endpoints:    10.20.58.2:80
Session Affinity: None
No events.
```


## 不指定 Selectors 的服务

在创建 Service 的时候，也可以不指定 Selectors，用来将 service 转发到 kubernetes 集群外部的服务（而不是 Pod）。目前支持两种方法：

（1）自定义 endpoint，即创建同名的 service 和 endpoint，在 endpoint 中设置外部服务的 IP 和端口

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  ports:
  - protocol: TCP
    port: 80
    targetPort: 9376
---
apiVersion: Endpoints
kind: v1
metadata:
  name: my-service
subsets:
  - addresses:
    - ip: 1.2.3.4
  -ports:
    - protocol: TCP
      port: 9063
```

（2）通过 DNS 转发，在 service 定义中指定 externalName。此时 DNS 服务会给 <service-name>.<namespace>.svc.cluster.local 创建一个 CNAME 记录，其值为 my.database.example.com。并且，该服务不会自动分配 Cluster IP，需要通过 service 的 DNS 来访问（这种服务也称为 Headless Service）。

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
  namespace: default
spec:
  type: ExternalName
  externalName: my.database.example.com
```


## Headless 服务

Headless 服务即不需要 Cluster IP 的服务，即在创建服务的时候指定 `spec.clusterIP=None`。包括两种类型：

  * 不指 定Selectors，但设置 externalName，即上面的（2），通过 CNAME 记录处理
  * 指定 Selectors，通过 DNS A 记录设置后端 endpoint 列表


## 代理模式（proxy-mode）

* userspace


* iptables

* ipvs


<!--
## Todo
-->


## 参考

* [Kubernetes Services](https://kubernetes.io/docs/concepts/services-networking/service/)
