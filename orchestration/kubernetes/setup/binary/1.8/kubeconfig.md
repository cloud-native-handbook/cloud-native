# 配置 kubeconfig

kubectl 默认从 `~/.kube/config` 配置文件中获取 kube-apiserver 的访问地址、当前命名空间、当前用户、用户凭证等信息。


## 安装 kubectl 【ALL MASTER】

```bash
$ ops/kubernetes/install-k8s-client.sh
```


## 配置 kube-scheduler kubeconfig 【kube-master-1】

待高可用集群部署好后，kube-apiserver 地址应该设置成 VIP （192.168.10.99）地址，由于 LB 部署在 master 上，为了避免与 kube-apiserver 端口冲突，设置 kube-apiserver 的安全端口为 6443，LB 的代理端口为 8443。

```bash
$ mkdir /etc/kubernetes/kubeconfig
$ cd /etc/kubernetes/pki

$ VIP=192.168.10.99
$ KUBE_APISERVER=https://${VIP}:8443

$ kubectl config set-cluster kubernetes \
  --certificate-authority=kubernetes-ca.pem \
  --embed-certs=true \
  --server=${KUBE_APISERVER} \
  --kubeconfig=/etc/kubernetes/kubeconfig/kube-scheduler.kubeconfig

$ kubectl config set-credentials system:kube-scheduler \
  --client-certificate=kube-scheduler.pem \
  --client-key=kube-scheduler-key.pem \
  --embed-certs=true \
  --kubeconfig=/etc/kubernetes/kubeconfig/kube-scheduler.kubeconfig

$ kubectl config set-context system:kube-scheduler@kubernetes \
  --cluster=kubernetes \
  --user=system:kube-scheduler \
  --kubeconfig=/etc/kubernetes/kubeconfig/kube-scheduler.kubeconfig

$ kubectl config use-context system:kube-scheduler@kubernetes \
  --kubeconfig=/etc/kubernetes/kubeconfig/kube-scheduler.kubeconfig
```

```bash
$ OTHER_MASTERS=(kube-master-2 kube-master-3)
$ for master in ${OTHER_MASTERS[@]}; do
  ssh -t root@${master} "mkdir -p /etc/kubernetes/pki"; \
  scp /etc/kubernetes/kubeconfig/kube-scheduler.kubeconfig root@${master}:/etc/kubernetes/pki; \
done
```


## 配置 kube-controller-manager kubeconfig 【kube-master-1】

待高可用集群部署好后，kube-apiserver 地址应该设置成 VIP （192.168.10.99）地址。

```bash
$ mkdir /etc/kubernetes/kubeconfig
$ cd /etc/kubernetes/pki

$ VIP=192.168.10.99
$ KUBE_APISERVER=https://${VIP}:8443

$ kubectl config set-cluster kubernetes \
  --certificate-authority=kubernetes-ca.pem \
  --embed-certs=true \
  --server=${KUBE_APISERVER} \
  --kubeconfig=/etc/kubernetes/kubeconfig/kube-controller-manager.kubeconfig

$ kubectl config set-credentials system:kube-controller-manager \
  --client-certificate=kube-controller-manager.pem \
  --client-key=kube-controller-manager-key.pem \
  --embed-certs=true \
  --kubeconfig=/etc/kubernetes/kubeconfig/kube-controller-manager.kubeconfig

$ kubectl config set-context system:kube-controller-manager@kubernetes \
  --cluster=kubernetes \
  --user=system:kube-controller-manager \
  --kubeconfig=/etc/kubernetes/kubeconfig/kube-controller-manager.kubeconfig

$ kubectl config use-context system:kube-controller-manager@kubernetes \
  --kubeconfig=/etc/kubernetes/kubeconfig/kube-controller-manager.kubeconfig
```

```bash
$ OTHER_MASTERS=(kube-master-2 kube-master-3)
$ for master in ${OTHER_MASTERS[@]}; do
  ssh -t root@${master} "mkdir -p /etc/kubernetes/pki"; \
  scp /etc/kubernetes/kubeconfig/kube-scheduler.kubeconfig root@${master}:/etc/kubernetes/pki; \
done
```


## 配置 kubelet bootstrap kubeconfig 【kube-master-1】

```bash
$ VIP=192.168.10.99
$ KUBE_APISERVER=https://${VIP}:8443

# 配置集群
$ kubectl config set-cluster kubernetes \
  --certificate-authority=/etc/kubernetes/pki/kubernetes-ca.pem \
  --embed-certs=true \
  --server=${KUBE_APISERVER} \
  --kubeconfig=/etc/kubernetes/kubeconfig/bootstrap.kubeconfig

# 为 kubelet-bootstrap 用户配置客户端认证（token 是在 token.csv 文件中指定的）
$ kubectl config set-credentials kubelet-bootstrap \
  --token=b675e56a592fefe0186164536d756301 \
  --kubeconfig=/etc/kubernetes/kubeconfig/bootstrap.kubeconfig

# 配置上下文（哪个用户使用哪个集群）
$ kubectl config set-context kubelet-bootstrap@kubernetes \
  --cluster=kubernetes \
  --user=kubelet-bootstrap \
  --kubeconfig=/etc/kubernetes/kubeconfig/bootstrap.kubeconfig

# 关联上下文
$ kubectl config use-context kubelet-bootstrap@kubernetes --kubeconfig=/etc/kubernetes/kubeconfig/bootstrap.kubeconfig

# 检查是否可以操作 csr 资源对象（当前只有该权限）
# kubectl get csr --kubeconfig=/etc/kubernetes/kubeconfig/bootstrap.kubeconfig
```

相关说明：

  * `--embed-certs`：设为 `true` 表示将 CA 证书写入到 kubelet.kubeconfig 文件中；

分发到所有节点（包括 Master 节点）：

```bash
$ OTHER_NODES=(kube-master-2 kube-master-3 kube-node-1 kube-node-2)
$ for node in ${OTHER_NODES[@]}; do
  ssh -t root@${node} "mkdir -p /etc/kubernetes/kubeconfig"; \
  scp /etc/kubernetes/kubeconfig/bootstrap.kubeconfig root@${node}:/etc/kubernetes/kubeconfig; \
done
```


## 配置 kube-proxy kubeconfig 【kube-master-1】

```bash
$ VIP=192.168.10.99
$ KUBE_APISERVER=https://${VIP}:8443

# 配置集群
$ kubectl config set-cluster kubernetes \
  --certificate-authority=/etc/kubernetes/pki/kubernetes-ca.pem \
  --embed-certs=true \
  --server=${KUBE_APISERVER} \
  --kubeconfig=/etc/kubernetes/kubeconfig/kube-proxy.kubeconfig

# 配置客户端身份
$ kubectl config set-credentials kube-proxy \
  --client-certificate=/etc/kubernetes/pki/kube-proxy.pem \
  --client-key=/etc/kubernetes/pki/kube-proxy-key.pem \
  --embed-certs=true \
  --kubeconfig=/etc/kubernetes/kubeconfig/kube-proxy.kubeconfig

# 配置上下文（关联集群和客户端身份）
$ kubectl config set-context kube-proxy@kubernetes \
  --cluster=kubernetes \
  --user=kube-proxy \
  --kubeconfig=/etc/kubernetes/kubeconfig/kube-proxy.kubeconfig

# 配置默认关联
$ kubectl config use-context kube-proxy@kubernetes --kubeconfig=/etc/kubernetes/kubeconfig/kube-proxy.kubeconfig
```

分发到所有节点（包括 Master 节点）：

```bash
$ OTHER_NODES=(kube-master-2 kube-master-3 kube-node-1 kube-node-2)
$ for node in ${OTHER_NODES[@]}; do
  ssh -t root@${node} "mkdir -p /etc/kubernetes/kubeconfig"; \
  scp /etc/kubernetes/kubeconfig/kube-proxy.kubeconfig root@${node}:/etc/kubernetes/kubeconfig; \
done
```


## 为集群管理员（cluster-admin）配置 kubeconfig 【ALL MASTER】

待高可用集群部署好后，如果需要在外部访问，这里的 kube-apiserver 地址应该设置成 VIP （192.168.10.99）地址。

```bash
$ mkdir -p /etc/kubernetes/kubeconfig
$ cd /etc/kubernetes/pki

# Master 节点的 kubectl 设置为本地地址，非 Master 节点设置为 VIP:8443
$ MY_MASTER_IP=192.168.10.80
$ KUBE_APISERVER=https://${MY_MASTER_IP}:6443

# 配置 kubernetes 集群
$ kubectl config set-cluster kubernetes \
  --certificate-authority=/etc/kubernetes/pki/kubernetes-ca.pem \
  --embed-certs=true \
  --server=${KUBE_APISERVER} \
  --kubeconfig=/etc/kubernetes/user/cluster-admin.kubeconfig

# 配置客户端用户 cluster-admin
$ kubectl config set-credentials cluster-admin \
  --client-certificate=/etc/kubernetes/user/cluster-admin.pem \
  --embed-certs=true \
  --client-key=/etc/kubernetes/user/cluster-admin-key.pem \
  --kubeconfig=/etc/kubernetes/user/cluster-admin.kubeconfig

# 配置上下文（哪个用户使用哪个集群）
$ kubectl config set-context cluster-admin@kubernetes \
  --cluster=kubernetes \
  --user=cluster-admin \
  --kubeconfig=/etc/kubernetes/user/cluster-admin.kubeconfig

# 切换上下文
$ kubectl config use-context cluster-admin@kubernetes --kubeconfig=/etc/kubernetes/user/cluster-admin.kubeconfig

# 设置为默认配置
$ cp /etc/kubernetes/user/cluster-admin.kubeconfig ~/.kube/config
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
--server=${KUBE_APISERVER} \
--kubeconfig=/etc/kubernetes/user/cluster-admin.kubeconfig

$ # 配置客户端用户 cluster-admin
$ kubectl config set-credentials cluster-admin \
--client-certificate=/etc/kubernetes/user/cluster-admin.pem \
--embed-certs=true \
--client-key=/etc/kubernetes/user/cluster-admin-key.pem \
--kubeconfig=/etc/kubernetes/user/cluster-admin.kubeconfig

$ # 配置上下文（哪个用户使用哪个集群）
$ kubectl config set-context cluster-admin@kubernetes \
--cluster=kubernetes \
--user=cluster-admin \
--kubeconfig=/etc/kubernetes/user/cluster-admin.kubeconfig

$ # 切换上下文
$ kubectl config use-context cluster-admin@kubernetes --kubeconfig=/etc/kubernetes/user/cluster-admin.kubeconfig

# 设置为默认配置
$ cp /etc/kubernetes/user/cluster-admin.kubeconfig ~/.kube/config
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
clusters:
- cluster:
    certificate-authority-data: REDACTED
    server: https://192.168.1.223:6443
  name: kubernetes
contexts:
- context:
    cluster: kubernetes
    user: cluster-admin
  name: cluster-admin@kubernetes
current-context: cluster-admin@kubernetes
kind: Config
preferences: {}
users:
- name: cluster-admin
  user:
    client-certificate-data: REDACTED
    client-key-data: REDACTED

$ kubectl get all
NAME             TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)   AGE
svc/kubernetes   ClusterIP   10.254.0.1   <none>        443/TCP   16h
```
