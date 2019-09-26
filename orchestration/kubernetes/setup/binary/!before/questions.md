# 问题汇总

## 问题 1

最初运行 kubelet 的时候提示：“Failed to list v1.Node/v1.Pod/v1.Service: nodes/pods/services is forbidden: User "system:node:k8s-node-1" cannot list nodes at the cluster scope”，导致 Node 不能加入集群。

另外，kube-apiserver 提示：“RBAC DENY: user "system:node:k8s-node-1" groups ["system:nodes" "system:authenticated"] cannot "list" resource "services" cluster-wide”

查看自动下发的证书（节点属于 `system:nodes` Group）：

```bash
$ cfssl-certinfo -cert /etc/kubernetes/pki/kubelet-client.crt
{
  "subject": {
    "common_name": "system:node:k8s-node-1",
    "organization": "system:nodes",
    "names": [
      "system:nodes",
      "system:node:k8s-node-1"
    ]
  },
  ...
}
```

查看 `system:node` ClusterRoleBinding 发现，`system:node` ClusterRole 没有被自动授予 `system:nodes` Group。

```bash
$ kubectl get clusterrolebinding system:node -o yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  annotations:
    rbac.authorization.kubernetes.io/autoupdate: "true"
  labels:
    kubernetes.io/bootstrapping: rbac-defaults
  name: system:node
  ...
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: system:node
subjects: null
```

* 问题原因

kubernetes 1.8，新增了 Node 授权模式，并且在 RBAC 授权模式中 `system:nodes` Group 不会自动绑定到 `system:node` ClusterRole。

* 解决办法一

如果只开启了 RBAC 授权模式，可以手动为 `system:nodes` Group 绑定 `system:node` ClusterRole：

```bash
$ kubectl edit clusterrolebinding system:node
...
subjects:
- apiGroup: rbac.authorization.k8s.io
  kind: Group
  name: system:nodes

# 或者
$ kubectl set subject clusterrolebinding system:node --group=system:nodes
```

* 解决办法二

为 kube-apiserver 开启 `Node` 授权模式以及 `NodeRestriction` 准入插件：

```
--authorization-mode=Node,RBAC --admission-control=...NodeRestriction...
```


## 问题二

启动 kubelet 时提示：“Failed to get system container stats for "/user.slice/user-1000.slice/session-1.scope": failed to get cgroup stats for "/user.slice/user-1000.slice/session-1.scope": failed to get container info for "/user.slice/user-1000.slice/session-1.scope": unknown container "/user.slice/user-1000.slice/session-1.scope"”

解决办法是在 kubelet 启动的时候添加两个参数：

```bash
# https://stackoverflow.com/questions/46726216/kubelet-fails-to-get-cgroup-stats-for-docker-and-kubelet-services
$ --runtime-cgroups=/systemd/system.slice --kubelet-cgroups=/systemd/system.slice
```


## 问题三

在高可用集群中，如果一个 master 节点的 kube-apiserver 挂了，它不会自动从 `kubernetes` SVC 的 endpoints 中移除。

> https://github.com/kubernetes/kubernetes/issues/22609
> https://github.com/kubernetes/kubernetes/issues/22609#issuecomment-322823425
> https://github.com/kubernetes/kubernetes/pull/36346


## 问题四

kubelet 使用 Bootstrap TLS 向 kube-apiserver 请求签发证书时，能正常创建 csr，但是 `kubectl certificate approve` 后 CONDITION 中缺少一个 `Issued`，并且查看 `kubectl get node` 时并没有节点加入。

```bash
# 能正常创建 csr
$ kubectl get csr
NAME                                                   AGE       REQUESTOR           CONDITION
node-csr-mmiLx8I-p46GpAEtHRZMpdU_qes6NPo3q1EeYC3OlQ8   1m        kubelet-bootstrap   Pending

# 批准加入集群
$ kubectl certificate approve node-csr-mmiLx8I-p46GpAEtHRZMpdU_qes6NPo3q1EeYC3OlQ8

# CONDITION 缺少 Issued
$ kubectl get csr
NAME                                                   AGE       REQUESTOR           CONDITION
node-csr-mmiLx8I-p46GpAEtHRZMpdU_qes6NPo3q1EeYC3OlQ8   1m        kubelet-bootstrap   Approved

# 查看 kube-controller-manager 日志
$ journalctl -f -u kube-controller-manager
kube-controller-manager: E1206 15:05:10.443177   11846 certificate_controller.go:139] Sync node-csr-mmiLx8I-p46GpAEtHRZMpdU_qes6NPo3q1EeYC3OlQ8 failed with : recognized csr "node-csr-mmiLx8I-p46GpAEtHRZMpdU_qes6NPo3q1EeYC3OlQ8" as [nodeclient] but subject access review was not approved
```

经过实验，我发现是主机名不规范导致的（我原先的主机名类似：`kube-node-1.xxx-xxx-xxx-xxx`），正确的做法是修改正规的主机名（如：`kube-node-1`），或者为 kubelet 增加 `--hostname-override` 参数，但是不推荐，因为设置这个参数后 kube-proxy 必须设置这个 `--hostname-override`（如果 kube-proxy 使用插件来部署的话非常不方便）。

另外，还需要确保整个过程中，证书没有出现修改的情况，必须保证各个 Master 节点的证书是一致的。


## 问题五

执行 `kubectl exec` 和 `kubectl logs` 时提示："Error from server: error dialing backend: x509: cannot validate certificate for x.x.x.x because it doesn't contain any IP SANs"。

为了能让 kube-apiserver 访问 kubelet，kube-apiserver 必须指定 `--kubelet-client-certificate` 和 `--kubelet-client-certificate` 参数，但不能再指定 `--kubelet-certificate-authority`。


## 问题六

执行 `kubectl exec` 和 `kubectl logs` 都提示不能解析主机名：

```
# kubectl logs
Error from server: Get https://kube-node-2:10250/containerLogs/default/nginx-85bf588b8-8bsx5/nginx: dial tcp: lookup kube-node-2 on 114.114.114.114:53: no such host

# kubectl exec
Error from server: error dialing backend: dial tcp: lookup kube-node-2 on 114.114.114.114:53: no such host
```

解决办法：

```bash
# 顺序不能
$ kube-apiserver   --kubelet-preferred-address-types=InternalIP,Hostname,ExternalIP
```
