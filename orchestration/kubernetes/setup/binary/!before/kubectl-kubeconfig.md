# 配置 kubectl

kubectl 默认从 `~/.kube/config` 配置文件中获取 kube-apiserver 的访问地址、当前命名空间、当前用户、用户凭证等信息。

## 安装 kubectl 【所有 Master 节点】

```bash
$ ops/kubernetes/install-k8s-client.sh
```

## 管理员

```bash
$ kubectl get clusterrole admin -o yaml
```

## 集群管理员

集群管理员可以 `完全` 访问 Kubernetes 集群。

为了方便管理 kubernetes 集群，需要创建一个集群管理员（假设是 `cluster-admin` User）来统一管理集群。kube-apiserver 首次启动的时候自动添加了一个 `cluster-admin` ClusterRoleBinding，将 `cluster-admin` ClusterRole 与 `system:masters` Group 绑定，所以创建集群管理员时只需要让其属于 `system:masters` Group 即可，用户名可以随意指定。

```bash
$ kubectl get clusterrolebinding cluster-admin -o yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  ...
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- apiGroup: rbac.authorization.k8s.io
  kind: Group
  name: system:masters
```

```bash
$ kubectl get clusterrole cluster-admin -o yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  ...
rules:
- apiGroups:
  - '*'
  resources:
  - '*'
  verbs:
  - '*'
- nonResourceURLs:
  - '*'
  verbs:
  - '*'
```

### 创建 cluster-admin CSR 配置文件 【k8s-master-1】

```bash
$ mkdir -p /etc/kubernetes/admin

$ cat > /etc/kubernetes/admin/cluster-admin-csr.json <<EOF
{
  "CN": "cluster-admin",
  "key": {
    "algo": "rsa",
    "size": 2048
  },
  "names": [
    {
      "C": "CN",
      "ST": "ShangHai",
      "L": "ShangHai",
      "O": "system:masters",
      "OU": "paas"
    }
  ]
}
EOF
```

相关说明：
  * CN: Common Name，即用户名；
  * O: Organization，即用户组；
  * hosts: 这里不需要指定 hosts Key，因为使用管理员证书的客户端的 IP 还不确定。


### 生成 cluster-admin 证书和私钥 【k8s-master-1】

```bash
$ cd /etc/kubernetes/admin

$ cfssl gencert -ca=/etc/kubernetes/pki/ca.pem \
-ca-key=/etc/kubernetes/pki/ca-key.pem \
-config=/etc/kubernetes/pki/ca-config.json \
-profile=kubernetes cluster-admin-csr.json | cfssljson -bare cluster-admin

$ ls cluster-admin*.pem
cluster-admin-key.pem  cluster-admin.pem
```

### 分发证书和私钥到其它 Master 节点 【k8s-master-1】

```bash
$ ssh -t root@k8s-master-2 "mkdir -p /etc/kubernetes/admin"
$ ssh -t root@k8s-master-3 "mkdir -p /etc/kubernetes/admin"

$ scp /etc/kubernetes/admin/cluster-admin*.pem root@k8s-master-2:/etc/kubernetes/admin
$ scp /etc/kubernetes/admin/cluster-admin*.pem root@k8s-master-3:/etc/kubernetes/admin
```


## 配置 kubectl kubeconfig 文件 【所有 Master 节点】

* 使用安全模式

```bash
$ # 其它 Master 分别是 172.72.4.12、172.72.4.13
$ MASTER_IP=172.72.4.11

$ # 配置 kubernetes 集群
$ kubectl config set-cluster kubernetes \
--certificate-authority=/etc/kubernetes/pki/ca.pem \
--embed-certs=true \
--server=https://${MASTER_IP}:6443 \
--kubeconfig=/etc/kubernetes/admin/cluster-admin.kubeconfig

$ # 配置客户端用户 cluster-admin
$ kubectl config set-credentials cluster-admin \
--client-certificate=/etc/kubernetes/admin/cluster-admin.pem \
--embed-certs=true \
--client-key=/etc/kubernetes/admin/cluster-admin-key.pem \
--kubeconfig=/etc/kubernetes/admin/cluster-admin.kubeconfig

$ # 配置上下文（哪个用户使用哪个集群）
$ kubectl config set-context cluster-admin@kubernetes \
--cluster=kubernetes \
--user=cluster-admin \
--kubeconfig=/etc/kubernetes/admin/cluster-admin.kubeconfig

$ # 切换上下文
$ kubectl config use-context cluster-admin@kubernetes --kubeconfig=/etc/kubernetes/admin/cluster-admin.kubeconfig

$ # 检查一下是否可用
$ kubectl get node --kubeconfig=/etc/kubernetes/admin/cluster-admin.kubeconfig

$ # 如果检查没问题，重定向到默认配置
$ cp /etc/kubernetes/admin/cluster-admin.kubeconfig ~/.kube/config
```

### Master 节点如何访问 kube-apiserver

如果部署 kube-apiserver 的时候使用了本地地址（`127.0.0.1:8080`），那么 Master 节点上的 kubectl 可以不用配置 kubeconfig，直接通过本地地址 `完全` 访问 kube-apiserver。

```bash
# k8s-master-1

$ netstat -tpln | grep kube-apiserver
tcp   0   0   172.72.4.11:6443  0.0.0.0:*   LISTEN    2559/kube-apiserver 
tcp   0   0   127.0.0.1:8080    0.0.0.0:*   LISTEN    2559/kube-apiserver

$ kubectl config view
apiVersion: v1
clusters: []
contexts: []
current-context: ""
kind: Config
preferences: {}
users: []

$ kubectl get all
NAME             TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)   AGE
svc/kubernetes   ClusterIP   10.254.0.1   <none>        443/TCP   16h
```
