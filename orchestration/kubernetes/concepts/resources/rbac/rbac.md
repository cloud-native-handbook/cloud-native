# RABC

## 问题

* 如何限制其他租户（Namespace）使用 NodePort 类型的 Service

## Role 和 ClusterRole

```bash
$ cat <<EOF | kubectl create -f -
apiVersion: rbac.authorization.k8s.io/v1beta1
kind: Role
metadata:
  name: basic-user
  namespace: yinrenqiang
rules:
- apiGroups:
  - ""
  re
EOF
```

* ClusterRole

ClusterRole 是在整个集群定义一组通用的角色，通常是为了方便被多个用户（User，对应多个命名空间）复用，或者只被一个用户组（Group，对应一个命名空间）引用。

```
apiVersion: rbac.authorization.k8s.io/v1beta1
kind: ClusterRole
metadata:
  name: paas:basic-user
rules:
- apiGroup: [""]
  resources: ["pod"]
  verbs: ["get", "watch", "list"]
- apiGroup: [""]
  resources: ["secrets"]
  verbs: ["get", "list"]
```


## RoleBinding 和 ClusterRoleBinding

* RoleBinding

RoleBinding 用于授权一个命名空间里的一个或一组用户。

`RoleBinding` 既可以引用 `Role`，也可以引用 `ClusterRole`。

```bash
$ cat <<EOF | kubectl apply -f -
apiVersion: rbac.authorization.k8s.io/v1beta1
kind: RoleBinding
metadata:
  name: paas:xiaoming
  namespace: paas
subjects:
- kind: User
  name: xiaoming
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: paas:basic-user
  apiGroup: rbac.authorization.k8s.io
EOF
```

```bash
$ kubectl create rolebinding paas:xiaoming --clusterrole=admin --user=xiaoming --namespace=paas
```

* ClusterRoleBinding

`ClusterRoleBinding` 用于在集群级别为所有命名空间授予权限。apiGroup 都是 `rbac.authorization.k8s.io`。

```bash
$ kubectl create clusterrolebinding
```

* Tips

建议 RoleBinding 和 ClusterRoleBinding 的名称与绑定的 subject（user、group 和 serviceaccount） 同名，方便查看为哪些 subject 分配了哪些权限。

```bash
$
```


## 子资源

* pods
  - pods/attach
  - pods/binding
  - pods/eviction
  - pods/exec
  - pods/log
  - pods/portforward
  - pods/proxy
  - pods/status
* replicationcontrollers
  - replicationcontrollers/scale
  - replicationcontrollers/status
* services
  - services/proxy
* resourcequotas
  - resourcequotas/status
* deployments
  - deployments/rollback
  - deployments/scale
* replicasets
  - replicasets/scale
* namespaces
  - namespaces/finalize
  - namespaces/status
* nodes
  - nodes/proxy
  - nodes/status
* persistentvolumeclaims
  - persistentvolumeclaims/status
* persistentvolumes
  - persistentvolumes/status
* certificatesigningrequests
  - certificatesigningrequests/approval
  - certificatesigningrequests/status


## APIGroup

* authentication.k8s.io
* authorization.k8s.io
* autoscaling
* batch
* certificates.k8s.io
* extensions
* policy
* rbac.authorization.k8s.io
* settings.k8s.io
* storage.k8s.io
* apps


## verb

* create
* delete
* deletecollection
* get
* list
* patch
* update
* watch


## Subject

`RoleBinding` 和 `ClusterRoleBinding` 绑定角色到 subject。Subject 可以是 user、group 以及 serviceaccount。

User 可以是普通的用户名，也可以是邮箱等等；这是在认证时通过 CSR 的 `CN` 来设置的。

Group 是在认证时通过 CSR 的 `OU` 来设置的。

ServiceAccount 带有 `systemct:serviceaccount:` 前缀，并且属于带有 `system:serviceaccounts:` 前缀的组。


## 参考

* [kubectl 的用户认证授权](https://jimmysong.io/posts/kubectl-user-authentication-authorization/)
