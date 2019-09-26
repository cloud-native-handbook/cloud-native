# kube-keepalived-vip

## 部署

### RBAC

```bash
$ kubectl apply -f manifests/vip-rbac.yaml
```

### ConfigMap

```bash
$ kubectl run nginx --image=nginx:alpine --port=80 --replicas=2
$ kubectl expose deploy/nginx --name=nginx --target-port=80 --port=8000
```

```yaml
# kubectl apply -f vip-cm.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: vip-configmap
data:
  172.72.4.98: default/nginx
```

kube-keepalived-vip 不支持动态修改 ConfigMap 来更新自身的配置（/etc/keepalived/keepalived.conf），但是可以间接通过修改其相关联的 Service （比如修改 Service 端口，甚至修改 SVS.spec.ports[].name 也能自动更新配置）来更新 kube-keepalived-vip 的配置，这应该是个 bug。

### kube-keepalived-vip

```bash
$ wget -O vip-daemonset.yaml https://github.com/kubernetes/contrib/blob/master/keepalived-vip/vip-daemonset.yaml

# 修改镜像源
$ sed -i "s|gcr.io/google_containers|dockerce|g" vip-daemonset.yaml

# 添加服务账号
# spec:
#   hostNetwork: true
#   serviceAccount: kube-keepalived-vip

# 指定部署节点
$ kubectl label node k8s-node-2 type=load-balancer

# 修改 nodeSelector
# spec:
#   nodeSelector:
#      load-balancer: true
```

```bash
$ kubectl apply -f manifests/vip.ds.yaml
```
