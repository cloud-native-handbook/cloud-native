# K8s 中部署挖矿程序

## 部署

* 直接访问矿池

```bash
# 创建命名空间
$ kubectl apply -f noproxy/ethereum.namespace.yaml

# 标记 GPU 节点及类型
$ kubectl label node kube-node-x node-type=gpu
$ kubectl label node kube-node-x nvidia.com/gpu-name="p106-100"

# 方式一：按 GPU 颗粒进行调度
$ kubectl apply -f noproxy/ethminer.deployment.yaml

# 方式二：按主机进行调度（默认申请主机所有 GPU 资源）
$ kubectl apply -f noproxy/ethminer.daemonset.yaml
```

* 代理到矿池

```bash
# 创建命名空间
$ kubectl apply -f proxy/ethereum.namespace.yaml

# 标记 GPU 节点及类型
$ kubectl label node kube-node-x node-type=gpu
$ kubectl label node kube-node-x nvidia.com/gpu-name="p106-100"

# 代理
$ kubectl apply -f proxy/ethproxy.daemonset.yaml
$ kubectl apply -f proxy/ethproxy.service.yaml

# 挖矿（方式一）
$ kubectl apply -f proxy/ethminer.deployment.yaml

# 挖矿（方式二）
$ kubectl apply -f proxy/ethminer.daemonset.yaml
```

## 注意事项

* 部署前先在节点上安装 nvidia-docker2 和 nvidia-container-runtime，然后部署 nvidia-device-plugin，这样才能申请 `nvidia.com/gpu` 资源；
* `ethminer` 的 `-SP` 参数需要根据不同的矿池进行调整：
  0: ethpool, ethermine, coinotron, mph, nanopool (默认值)
  1: dwarfpool, f2pool, ethfans, nanopool
  2: nicehash
* 部署方案建议：
  * 星火矿池: `DaemonSet` + `100ms` + `HOST_IP` + `-SP=1` --> 代理
  * ethermine: `Deployment` + `100ms` + `POD_IP` --> 代理
* 需要注意的是，更新代理 ConfigMap （`kubectl apply`/`kubectl edit`）和/或更新代理（`kubectl apply`/`kubectl replace`）本身并不会自动配置文件，建议配置环境变量并直接更新代理，这与挂载 ConfigMap 作为文件有关，https://github.com/kubernetes/kubernetes/issues/44815#issuecomment-354420762；
