# Kubeapps

Kubeapps 相当于整合了 Helm Tiller 和 Monocular，所以有些地方和 Helm Tiller 可能会冲突，比如 clusterrolebing （可以定义两个不同的名字）

## 组件

### kubeapps

* nginx-ingress-controller
* default-http-backend
* mongodb
* kubeless-ui --> ui & proxy
* kubeapps-dashboard-ui
* kubeapps-dashboard-api --> ui & tiller

### kubeless

* zookeeper
* kafka
* kubeless-controller


## 部署

### 安装 kubeapps 客户端

```bash
$ git clone github.com/jinsyin/ops
$ ops/kubernetes/install-kubeapps.sh
```

### 部署 kubeapps 服务端

```bash
# 启动 kubeapps
$ kubeapps up --dry-run -o yaml
$ kubeapps up

# 修改镜像
$ kubectl -n kubeapps set image deploy/kubeapps-dashboard-api tiller=registry.cn-hangzhou.aliyuncs.com/google_containers/tiller:v2.7.2
$ kubectl -n kubeapps set image deploy/default-http-backend default-http-backend=mirrorgooglecontainers/defaultbackend:1.4
$ kubectl -n kubeapps set image deploy/nginx-ingress-controller nginx=mirrorgooglecontainers/nginx-ingress-controller:0.9.0-beta.15

# kubeapps 命名空间创建 ceph secret
$ cat <<EOF | kubectl -n kubeapps apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: ceph-secret-kube
type: kubernetes.io/rbd
data:
  key: QVFCRkNGOWErZExhSEJBQTR5S3FJaE1Zb1Q0RG1BV25HMDhYRkE9PQ==
EOF

# kubeless 命名空间创建 ceph secret
$ cat <<EOF | kubectl -n kubeless apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: ceph-secret-kube
type: kubernetes.io/rbd
data:
  key: QVFCRkNGOWErZExhSEJBQTR5S3FJaE1Zb1Q0RG1BV25HMDhYRkE9PQ==
EOF

# Check
$ kubectl -n kubeapps get all,ing
$ kubectl -n kubeless get all
```

为 nginx ingress controller 授权：




## kubeapps dashboard

```bash
# 启动仪表盘（需要在桌面端）
$ kubeapps dashboard --port 8888
```


## 卸载

```bash
$ kubectl delete namespace kubeapps
$ kubectl delete namespace kubeless
```


## 参考

* [Kubeapps](https://github.com/kubeapps/kubeapps)