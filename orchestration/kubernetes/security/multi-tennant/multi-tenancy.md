# 多租户管理（基于证书）

## 生成用户证书和服务账号

```bash
cat <<EOF > huangzhenyou-csr.json
{
  "CN": "huangzhenyou",
  "key": {
    "algo": "rsa",
    "size": 2048
  },
  "names": [
    {
      "C": "CN",
      "ST": "ShangHai",
      "L": "ShangHai",
      "O": "deployers"
    }
  ]
}
EOF
```

```bash
$ cfssl gencert -ca /etc/kubernetes/pki/kubernetes-ca.pem \
-ca-key /etc/kubernetes/pki/kubernetes-ca-key.pem \
-config /etc/kubernetes/pki/kubernetes-ca-config.json \
-profile=client huangzhenyou-csr.json | cfssljson -bare huangzhenyou
```

服务账号用于访问 Kubernetes Dashboard：

```yaml
# 先创建命名空间
$ cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Namespace
metadata:
  name: huangzhenyou
EOF

# 创建服务账号
$ cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ServiceAccount
metadata:
  name: admin
  namespace: huangzhenyou
EOF
```

## 生成 kubeconfig

```bash
$ KUBE_APISERVER=https://192.168.10.99:8443

$ kubectl config set-cluster kubernetes \
  --certificate-authority=/etc/kubernetes/pki/kubernetes-ca.pem \
  --embed-certs=true \
  --server=${KUBE_APISERVER} \
  --kubeconfig=huangzhenyou.kubeconfig

$ kubectl config set-credentials huangzhenyou \
  --client-certificate=huangzhenyou.pem \
  --client-key=huangzhenyou-key.pem \
  --embed-certs=true \
  --kubeconfig=huangzhenyou.kubeconfig

$ kubectl config set-context huangzhenyou@kubernetes \
  --cluster=kubernetes \
  --user=huangzhenyou \
  --namespace=huangzhenyou \
  --kubeconfig=huangzhenyou.kubeconfig

$ kubectl config use-context huangzhenyou@kubernetes \
  --kubeconfig=huangzhenyou.kubeconfig
```

## RBAC 授权

```bash
$ cat <<EOF | kubectl apply -f -
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: admin
  namespace: huangzhenyou
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: admin
subjects:
- kind: User
  name: huangzhenyou
- kind: ServiceAccount
  name: admin
  namespace: huangzhenyou
EOF
```

> 注意：切勿将用户绑定的 ClusterRole 设置为系统默认的 `cluster-admin`（上面设置的是系统默认的 admin），否则用户将有权限修改命名空间的所有资源（包括 ResourceQuota 和 LimitRange）。

```bash
# 查询 ServiceAccount 自动绑定的 token
$ kubectl -n huangzhenyou get secret | grep admin-token
admin-token-hlnjw  kubernetes.io/service-account-token  3  2m

# 获取 base64 编码的 token
$ kubectl -n huangzhenyou get secret admin-token-hlnjw -o jsonpath={.data.token} | base64 -d
```

最后，在 huangzhenyou.kubeconfig 最后添加一个 token：

```bash
$ cat huangzhenyou.kubeconfig
...
users:
- name: cluster-admin
  user:
    as-user-extra: {}
    client-certificate-data: ...
    client-key-data: ...
    # 这里增加一个 token 字段，并添加上面生成的 base64 编码的 token
    token: <token-bash64>
```

## ResourceQuota & LimitRange

### LimitRange

```bash
$ cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: LimitRange
metadata:
  name: limit
  namespace: huangzhenyou
spec:
  limits:
  - type: Container
    defaultRequest:
      cpu: 50m
      memory: 64Mi
    default:
      cpu: 100m
      memory: 100Mi
    min:
      cpu: 10m
      memory: 32Mi
    max:
      cpu: 1000m
      memory: 1Gi
EOF
```

### ResourceQuota

```bash
$ cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ResourceQuota
metadata:
  name: quota
  namespace: huangzhenyou
spec:
  hard:
    requests.cpu: "4"
    requests.memory: "8Gi"
    limits.cpu: "5"
    limits.memory: "10Gi"
    pods: "50"
    resourcequotas: "0"
    services.loadbalancers: "0"
    services.nodeports: "0"
    requests.storage: "50Gi"
    persistentvolumeclaims: "20"
EOF
```
