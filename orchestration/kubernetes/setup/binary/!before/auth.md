# 认证和授权

下面的操作创建一个 `xiaoming` 用户并将其同时绑定到 `xiaoming`、`dev`、`test` 三个 namespace。


## 认证方式

* 客户端证书认证（client authentication）
* Token 认证
  * 静态 Token 文件
  * Bootstrap Token
* 静态密码文件
* Service Account Token
* OpenID Connect Token



## 创建证书签名请求（CSR）

原则上，应该由 `xiaoming` 用户来创建 CSR 并将其提交给管理员（CA 持有者），再由管理员来为其签发证书。如果为了方便管理，也可以由管理员直接为 `xiaoming` 用户创建 CSR。

```bash
$ cat <<EOF > xiaoming-csr.json
{
  "CN": "xiaoming",
  "hosts": [],
  "key": {
    "algo": "rsa",
    "size": 2048
  },
  "names": [
    {
      "C": "CN",
      "ST": "ShangHai",
      "L": "ShangHai",
      "O": "k8s",
      "OU": "System"
    }
  ]
}
EOF
```

相关说明：
  * `CN`：相当于用户名（对应 RBAC subject 中的 `User`）；
  * `O`： 相当于用户所属的组（对应 RBAC subject 中的 `Group`）；


为 `xiaoming` 用户签发证书和私钥：

```bash
$ # 在 master 节点上
$ cfssl gencert -ca=/etc/kubernetes/pki/ca.pem \
-ca-key=/etc/kubernetes/pki/ca-key.pem \
-config=/etc/kubernetes/pki/ca-config.json \
-profile=kubernetes xiaoming-csr.json | cfssljson -bare xiaoming

$ ls xiaoming*
xiaoming-csr.json xiaoming.csr  xiaoming-key.pem  xiaoming.pem
```

管理员需要将签发的证书（`xiaoming.pem`）、私钥（`xiaoming-key.pem`）以及 CA 证书（`ca.pem`）发放给 `xiaoming` 用户。


## ClusterRoleBinding

下面的操作由管理员进行：使用 RBAC 限制 `xiaoming` 用户可以操纵的命名空间以及所具有的 clusterrole。

```bash
$ kubectl create namespace xiaoming
$ kubectl create namespace dev

$ # 将 “xiaoming” 用户限制在 “xiaoming”、“dev” 两个命名空间，所属的 clusterrole 为 “admin”；--user 需要和 CSR 中的 CN 保持一致
$ kubectl create rolebinding developer:xiaoming --clusterrole=cluster-admin --user=xiaoming --namespace=xiaoming
$ kubectl create rolebinding developer:xiaoming --clusterrole=cluster-admin --user=xiaoming --namespace=dev
```


## 客户端配置 kubeconfig

`xiaoming` 用户在拿到管理员签发的证书（`xiaoming.pem`）、私钥（`xiaoming-key.pem`）以及 CA 证书（`ca.pem`）后，需要配置 kubectl 以访问 kubernetes 集群。下面的操作在 `xiaoming` 的机器上操作，要求事先开启防火墙允许 `xiaoming` 与 API Server 建立网络通信。

```bash
$ KUBE_APISERVER="https://172.72.4.11:6443"

$ # 配置待访问的 “kubernetes” 集群，并将集群信息保存到 xiaoming.kubeconfig
$ kubectl config set-cluster kubernetes \
--certificate-authority=/etc/kubernetes/pki/ca.pem \
--embed-certs=true \
--server=${KUBE_APISERVER} \
--kubeconfig=xiaoming.kubeconfig

$ # 为 “xiaoming” 用户配置客户端证书，并将用户信息保存到 xiaoming.kubeconfig
$ kubectl config set-credentials kubernetes-xiaoming \
--client-certificate=/etc/kubernetes/pki/xiaoming.pem \
--client-key=/etc/kubernetes/pki/xiaoming-key.pem \
--embed-certs=true \
--kubeconfig=xiaoming.kubeconfig

$ # 为 “xiaoming”
$ kubectl config set-context kubernetes:xiaoming:xiaoming@kubernetes \
--cluster=kubernetes \
--namespace=xiaoming \
--user=kubernetes-xiaoming \
--kubeconfig=xiaoming.kubeconfig

$ #
$ kubectl config set-context kubernetes:dev:xiaoming@kubernetes \
--cluster=kubernetes \
--namespace=dev \
--user=kubernetes-xiaoming \
--kubeconfig=xiaoming.kubeconfig

$ #
$ kubectl config use-context kubernetes:xiaoming:xiaoming@kubernetes \
--kubeconfig=xiaoming.kubeconfig

$ # kubectl 默认从 “$HOME/.kube/config” 中加载 context 配置，所以需要用 “xiaoming.kubeconfig” 文件替换默认配置
$ cp -f ./xiaoming.kubeconfig /$HOME/.kube/config

$ kubectl config get-contexts
CURRENT   NAME                                    CLUSTER      AUTHINFO                 NAMESPACE
*         kubernetes:yinrenqiang:yinrenqiang@kubernetes       kubernetes   kubernetes-yinrenqiang   yinrenqiang
          kubernetes:dev:yinrenqiang@kubernetes   kubernetes   kubernetes-yinrenqiang   dev
```


### 集群管理员

> kubectl-kubeconfig.md
