# Service Catalog


## Open Service Broker API

* Service Catalog

调用 API
定义流程
提供界面

* Service Brokers

提供 API
执行任务
输出能力


## Service Catalog

### 安装

* 在线 Chart

```bash
# 添加 service-catalog Helm 仓库
$ helm repo add svc-cat https://svc-catalog-charts.storage.googleapis.com
$ helm search service-catalog

# 安装 Chart
$ helm install svc-cat/catalog --name catalog --namespace catalog --set key=value[,key=value]
```

* 离线 Chart

```bash
$ git clone https://github.com/kubernetes-incubator/service-catalog.git
$ cd service-catalog/charts/catalog

# 安装 Chart
$ helm install . --name catalog --namespace catalog --set key=value[,key=value]
```

* 可选参数

```
apiserver.image = quay.io/kubernetes-service-catalog/apiserver:v0.1.5
controllerManager.image = quay.io/kubernetes-service-catalog/controller-manager:canary
apiserver.storage.type = etcd
etcd_image = quay.io/coreos/etcd:latest
```

###


### 卸载

```bash
$ helm delete --purge catalog
```


## 参考

* [用 service catalog 构造 k8s 服务能力中心](http://www.docin.com/p-1957163727.html)
* [Openshift service-catalog dockerfile](https://github.com/openshift/origin/tree/master/images/service-catalog)
* [Open Service Broker API](https://github.com/openservicebrokerapi/servicebroker)
* [Azure Service Broker 让应用部署更简单](https://wenku.baidu.com/view/30190a7cc4da50e2524de518964bcf84b9d52de0.html)
* [Install Service Catalog using Helm](https://kubernetes.io/docs/tasks/service-catalog/install-service-catalog-using-helm/)


https://github.com/kubernetes-incubator/service-catalog/tree/master/charts/catalog

https://github.com/kubernetes-incubator/service-catalog