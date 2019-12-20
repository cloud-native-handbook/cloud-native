# CertificateSigningRequest(CSR)

## Bootstrap TLS

## kubelet 如何使用 Bootstrap TLS

1. 首先需要为每个 kubelet 创建用户名、用户组和 token 等身份信息，kubelet 在没有获取 kube-controller-manager 下发的证书之前会使用这些身份信息向 kube-apiserver 请求创建 csr 或者监听 csr 的动态。为了便于集群的扩展，通常会为 kubelet 创建统一的身份信息。

```bash
# 生成 token
$ head -c 16 /dev/urandom | od -An -t x | tr -d ' '
b675e56a592fefe0186164536d756301

# 管理员为 kubelet 指定统一的 token、用户名（kube-bootstrap）、用户编号（10001）、用户组（system:kubelet-bootstrap）
$ cat > /etc/kubernetes/token.csv <<EOF
b675e56a592fefe0186164536d756301,kubelet-bootstrap,10001,"system:kubelet-bootstrap"
EOF

# kube-apiserver 启动时需要指定 token 认证文件
$ kube-apiserver ... --token-auth-file=/etc/kubernetes/token.csr ...
```

2. 管理员为 kubelet 授予创建 csr 等权限。

```bash
# 为统一的用户授权
$ kubectl create clusterrolebinding kubelet-bootstrap --clusterrole=system:node-bootstrapper --user=kubelet-bootstrap

# 如果为 kubelet 指定了多个不同的用户或/和用户组，可以直接对用户组进行授权
$ kubectl create clusterrolebinding kubelet-bootstrap --clusterrole=system:node-bootstrapper --group=system:kubelet-bootstrap
```

上面指定的 `system:node-bootstrapper` ClusterRole 是系统自动创建的：

```bash
kubectl get clusterrole system:node-bootstrapper -o yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: system:node-bootstrapper
  ...
rules:
- apiGroups:
  - certificates.k8s.io
  resources:
  - certificatesigningrequests
  verbs:
  - create
  - get
  - list
  - watch
```

3. kubelet 首次发送 Bootstrap TLS 请求时，会自动创建三个文件：

```bash
$ cd /etc/kubernetes/pki && ls kubelet*
kubelet-client.key  kubelet.crt  kubelet.key
```

4. kubelet 发送 Bootstrap TLS 请求后，kube-apiserver 会先判断 kubelet 的身份信息是否合法（根据 token 认证文件来判断）；如果合法，kube-apiserver 会自动为其创建 csr。待管理员批准（`approve`）该 csr 后，kube-controller-manager 会自动为 kubelet 下发客户端证书，如果下发成功会自动将 kubelet 所在的节点加入 Kubernete 集群。

```bash
# kubelet 提交 bootstrap tls 请求后
$ kubectl get csr
NAME                                                   AGE       REQUESTOR           CONDITION
node-csr-418GEDQmfQ37PlsfPOQllABxergZ4FByHrQWOH9z0_Y   20d       kubelet-bootstrap   Pending

# 管理员批准该 csr
$ kubectl certificate approve node-csr-418GEDQmfQ37PlsfPOQllABxergZ4FByHrQWOH9z0_Y

# 如果 CONDITION 显示 “Approved,Issued” 则表示成功为 kubelet 签发了客户端证书，否则表示签发失败
$ kubectl get csr
NAME                                                   AGE       REQUESTOR           CONDITION
node-csr-418GEDQmfQ37PlsfPOQllABxergZ4FByHrQWOH9z0_Y   20d       kubelet-bootstrap   Approved,Issued

# 节点自动加入集群
$ kubectl get node
NAME           STATUS    ROLES    AGE    VERSION
kube-node-1    Ready     node     2d     v1.8.2
```

kubelet 所在的节点自动生成了 kube-controller-manager 下发的证书，并自动创建了 kubelet kubeconfig。

```bash
$ cd /etc/kubernetes/pki && ls kubelet*
kubelet-client.crt  kubelet-client.key  kubelet.crt  kubelet.key

$ cd /etc/kubernetes/kubeconfig && ls
bootstrap.kubeconfig  kubelet.kubeconfig
```
