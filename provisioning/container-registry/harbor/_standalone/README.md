# HA Harbor

Harbor 是 VMware 中国公司开源的企业级 Docker Registry 项目。Harbor 在 Docker Registry 的基础上提供了 UI 管理、用户权限管理和镜像同步等功能。

## HA RadosGW

默认的 Ceph RadosGW 并未提供高可用机制，如果你所在的公司没有 L4/L7 负载均衡，可以利用 Kubernetes 的 Service/Endpoints 为 RadosGW 提供高可用支持（如果 kube-proxy 使用 ipvs 模式效果会更好）。

```bash
$ cat <<EOF | kubectl -n harbor apply -f -
apiVersion: v1
kind: Service
metadata:
  name: radosgw
spec:
  type: ClusterIP
  sessionAffinity: ClientIP
  ports:
  - name: api
    port: 7480
    targetPort: api
---
apiVersion: v1
kind: Endpoints
metadata:
  name: radosgw
subsets:
- addresses:
  - ip: 192.168.10.200
  - ip: 192.168.10.201
  - ip: 192.168.10.202
  ports:
  - name: api
    port: 7480
    protocol: TCP
EOF
```


## 组件

* log: Harbor 日志服务，统一管理 Harbor 的日志（docker swarm 才有）。
* ui: Harbor web 管理界面以及 Harbor api。
* jobservicer: 负责镜像同步，即在多个 registry 之间通过 registry api 同步镜像，并记录 job 日志。
* adminserver: 管理系统配置和检查存储使用情况。
* mysql: Harbor 数据库；保存了系统的 job、project、用户信息（前提是认证采用本地数据库）、访问权限以及用户角色等等。
* registry: 镜像仓库；上传后通过 hook 通知 `ui`，`ui` 再将镜像相关信息写入 `mysql`；另外，`registry` 通过 `ui` 组件完成 token 认证。
* nginx: 负载均衡；负责将流量分发到后端的 `ui` 和 `registry`。

当系统启动时，`ui` 和 `jobservice` 从 `adminserver` 处读取各自所需的配置，完成自身启动过程。之后用户可以通过 web 界面或者通过 api 修改部分系统配置。修改后的配置会被写入到 `adminserver` 中。其他组件重新读取 `adminserver` 的配置信息就可以得到最新的配置。

参考：

* [Harbor v1.1 新增独立的管理员界面](http://www.sohu.com/a/154158608_609552)
* [谈谈我对 Harbor 认识](http://blog.csdn.net/u010278923/article/details/77941995)
* [Harbor 源码分析之安装部署（一）](http://blog.csdn.net/u010278923/article/details/72440653)
* [Harbor 源码分析之组件分析（二）](http://blog.csdn.net/u010278923/article/details/72468791)
* [Harbor 源码分析之 registry v2 认证（三）](http://blog.csdn.net/u010278923/article/details/72471985)
* [Harbor 源码分析之API（四）](http://blog.csdn.net/u010278923/article/details/72514760)
* [Harbor 源码分析之仓库同步（五）](http://blog.csdn.net/u010278923/article/details/72549580)

## 共享存储

* CephFS
* GlusterFS
* Ceph Radosgw


## 认证

目前支持两种认证模式：本地数据库（即 MySQL）和 `AD/LDAP`。当有新的用户注册或者使用 `AD/LDAP` 用户登录过系统后，为防止来自不同认证源的用户之间的冲突，认证模式将不再允许被修改。如果原有系统采用AD/LDAP认证模式，并且已经创建过用户，请务必在第一次启动新版本前，将harbor.cfg中的 auth_mode 配置成 ldap_auth 。否则无法在启动后切换到 LDAP／AD 认证。

在 “Replication” 选项页面，可以修改在同步镜像的过程中是否检查证书的合法性。如果远端 Harbor 使用的是自签名证书，请确保复选框没有被勾选。


docker registry 认证步骤：

1.docker client 尝试到registry中进行push/pull操作；
2.registry会返回401未认证信息给client(未认证的前提下)，同时返回的信息中还包含了到哪里去认证的信息；
3.client发送认证请求到认证服务器(authorization service)；
4.认证服务器(authorization service)返回token；
5.client携带这附有token的请求，尝试请求registry；
6.registry接受了认证的token并且使得client继续操作


## 权限和角色

```mysql
mysql> select * from registry.access;
+-----------+-------------+-------------------------------+
| access_id | access_code | comment                       |
+-----------+-------------+-------------------------------+
|         1 | M           | Management access for project |
|         2 | R           | Read access for project       |
|         3 | W           | Write access for project      |
|         4 | D           | Delete access for project     |
|         5 | S           | Search access for project     |
+-----------+-------------+-------------------------------+

mysql> select * from registry.role;
+---------+-----------+-----------+--------------+
| role_id | role_mask | role_code | name         |
+---------+-----------+-----------+--------------+
|       1 |         0 | MDRWS     | projectAdmin |
|       2 |         0 | RWS       | developer    |
|       3 |         0 | RS        | guest        |
+---------+-----------+-----------+--------------+
```

访问权限：

* M: 最高权限
* R: 读取权限
* W: 写入权限
* D: 删除权限
* S: 查询取消

用户角色：

* 项目管理员（MDRWS）
* 开发人员（RWS）
* 访客（RS）


## 项目管理

项目管理是系统最主要的一个功能模块，项目是一组镜像仓库的逻辑集合，是权限管理和资源管理的单元划分。一个项目下面有多个镜像仓库，并且关联多个不同角色的成员，镜像复制也是基于项目的，通过添加复制规则，可以将项目下面的镜像从一个harbor迁移到另一个harbor，并且可以通过日志查看复制过程，并有retry机制。

## 配置 - HTTP

harbor.cfg 文件中的配置被分为两类，一类是必需的（madatory），如主机名称 hostname；另一类是可选的（ optional ），如 LDAP 的配置。在 Harbor 初次启动时，Admin Server 从 harbor.cfg 文件读取配置并记录下来。之后重新启动Harbor的过程中，只有必需的配置会从 harbor.cfg 文件读取；其他可选的配置将不再生效，需要通过 Admin Server 的管理界面来修改。

* 配置 Harbor

```
# 如果用于内网访问，我们将 hostname 设置为 nginx service 的全称域名
# 如果用于外网访问，我们将 hostname 设置为 nginx 对应的外网 IP 或域名
hostname = nginx.harbor.svc.cluster.local

# UI 管理员（admin） 的密码
harbor_admin_password = Harbor12345
```

* 配置 MySQL

```
# root 用户的密码
db_password = root123
```

修改配置后，需要重新执行 `k8s-prepare` 脚本生成新的配置，并重新部署 Harbor 容器。

* [Configuring Harbor](https://github.com/vmware/harbor/blob/master/docs/installation_guide.md#configuring-harbor)


## 配置 - HTTPS

```
# 如果用于内网访问，我们将 hostname 设置为 nginx service 的全称域名
# 如果用于外网访问，我们将 hostname 设置为 nginx 对应的外网 IP 或域名
hostname = harbor.local

# 访问私有 registry 使用的协议，如果是 http 则客户端 docker daemon 需要添加 --insecure-registry 参数
ui_url_protocol = https
ssl_cert = off
ssl_cert_key = /data/certs/
secretkey_path = /data/certs/
```


## 生成 config map

```bash
$ git clone https://github.com/vmware/harbor.git
$ cd harbor && git checkout tags/v1.2.0

# 修改 harbor.cfg 配置文件后，生成相应的 yaml 文件
$ python make/kubernetes/k8s-prepare -f make/harbor.cfg
```


## 基本部署

```bash
# 创建命名空间
$ kubectl create namespace harbor

# 创建 rbd secret
$ cat <<EOF | kubectl -n harbor apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: ceph-secret-kube
type: kubernetes.io/rbd
data:
  key: QVFCRkNGOWErZExhSEJBQTR5S3FJaE1Zb1Q0RG1BV25HMDhYRkE9PQ==
EOF
```

```bash
# create pvc & pv
kubectl -n harbor apply -f make/kubernetes/pvc/log.pvc.yaml
kubectl -n harbor apply -f make/kubernetes/pvc/registry.pvc.yaml
kubectl -n harbor apply -f make/kubernetes/pvc/storage.pvc.yaml

# create config map
kubectl -n harbor apply -f make/kubernetes/jobservice/jobservice.cm.yaml
kubectl -n harbor apply -f make/kubernetes/mysql/mysql.cm.yaml
kubectl -n harbor apply -f make/kubernetes/registry/registry.cm.yaml
kubectl -n harbor apply -f make/kubernetes/ui/ui.cm.yaml
kubectl -n harbor apply -f make/kubernetes/adminserver/adminserver.cm.yaml
kubectl -n harbor apply -f make/kubernetes/nginx/nginx.cm.yaml

# create service
kubectl -n harbor apply -f make/kubernetes/jobservice/jobservice.svc.yaml
kubectl -n harbor apply -f make/kubernetes/mysql/mysql.svc.yaml
kubectl -n harbor apply -f make/kubernetes/registry/registry.svc.yaml
kubectl -n harbor apply -f make/kubernetes/ui/ui.svc.yaml
kubectl -n harbor apply -f make/kubernetes/adminserver/adminserver.svc.yaml
kubectl -n harbor apply -f make/kubernetes/nginx/nginx.svc.yaml

# create k8s ReplicationController
kubectl -n harbor apply -f make/kubernetes/registry/registry.rc.yaml
kubectl -n harbor apply -f make/kubernetes/mysql/mysql.rc.yaml
kubectl -n harbor apply -f make/kubernetes/jobservice/jobservice.rc.yaml
kubectl -n harbor apply -f make/kubernetes/ui/ui.rc.yaml
kubectl -n harbor apply -f make/kubernetes/adminserver/adminserver.rc.yaml
kubectl -n harbor apply -f make/kubernetes/nginx/nginx.rc.yaml

# create k8s ingress
kubectl -n harbor apply -f make/kubernetes/ingress.yaml
```

检查：

```bash
$ kubectl -n harbor get pvc,rc,pod,svc,ep,ing -o wide
```


## 测试

### UI 管理

登录：`http://ui.harbor.svc.cluster.local`，管理员账号／密码：`admin/Harbor12345`


### 镜像管理

```bash
# 检查是否可以获取到 token（需要先登录）
$ curl http://ui.harbor.svc.cluster.local/service/token?account=admin&client_id=docker&offline_token=true&service=harbor-registry

# 客户端登录
$ docker login nginx.harbor.svc.cluster.local
Username: admin
Password: Harbor12345

# 上传镜像到 Harbor
$ docker push nginx:alpine
$ docker tag ngxin:alpine nginx.harbor.svc.cluster.local/library/nginx:alpine
$ docker push nginx.harbor.svc.cluster.local/library/nginx:alpine

# 删除本地镜像
$ docker rmi nginx:alpine nginx.harbor.svc.cluster.local/library/nginx:alpine

# 从 Harbor 拉取镜像
$ docker pull nginx.harbor.svc.cluster.local/library/nginx:alpine
```




```bash
# create pv & pvc
kubectl apply -f make/kubernetes/pv/log.pv.yaml
kubectl apply -f make/kubernetes/pv/registry.pv.yaml
kubectl apply -f make/kubernetes/pv/storage.pv.yaml
kubectl apply -f make/kubernetes/pv/log.pvc.yaml
kubectl apply -f make/kubernetes/pv/registry.pvc.yaml
kubectl apply -f make/kubernetes/pv/storage.pvc.yaml

# create config map

# create service
kubectl apply -f make/kubernetes/jobservice/jobservice.svc.yaml
kubectl apply -f make/kubernetes/mysql/mysql.svc.yaml
kubectl apply -f make/kubernetes/registry/registry.svc.yaml
kubectl apply -f make/kubernetes/ui/ui.svc.yaml
kubectl apply -f make/kubernetes/adminserver/adminserver.svc.yaml

# create k8s deployment
kubectl apply -f make/kubernetes/registry/registry.deploy.yaml
kubectl apply -f make/kubernetes/mysql/mysql.deploy.yaml
kubectl apply -f make/kubernetes/jobservice/jobservice.deploy.yaml
kubectl apply -f make/kubernetes/ui/ui.deploy.yaml
kubectl apply -f make/kubernetes/adminserver/adminserver.deploy.yaml

# create k8s ingress
kubectl apply -f make/kubernetes/ingress.yaml
```


## LDAP 认证

Harbor支持两种认证方式，默认为本地存储，即账号信息存储在mysql下.另外一种认证方式LDAP，只需要修改配置文件即可。需要提供ldap url以及ldap basedn参数，并且设置auth_mode为ldap_auth。

### 部署 LDAP

```bash
NAME=ldap_server

docker run --env LDAP_ORGANISATION="Unitedstack Inc." \

--env LDAP_DOMAIN="ustack.com" \

--env LDAP_ADMIN_PASSWORD="admin_password" \

-v pwd/containers/openldap/data:/var/lib/ldap \

-v pwd/containers/openldap/slapd.d:/etc/ldap/slapd.d \

--detach --name $NAME osixia/openldap:1.1.2
```

创建新用户，首先需要定义ldif文件，new_user.ldif：

dn: uid=test,dc=ustack,dc=com

uid: test

cn: test

sn: 3

objectClass: top

objectClass: posixAccount

objectClass: inetOrgPerson

loginShell: /bin/bash

homeDirectory: /home/test

uidNumber: 1001

gidNumber: 1001

userPassword: 1q2w3e4r

mail: test@example.com

gecos: test



通过以下脚本创建新用户，其中ldap_server为LDAP服务容器名称。

docker cp new_user.ldif ldap_server:/

docker exec ldap_server ldapadd -x \

-D "cn=admin,dc=ustack,dc=com" \

-w admin_password \

-f /new_user.ldif -ZZ



查看用户是否创建成功：

docker exec ldap_server ldapsearch -x -h localhost \

-b dc=ustack,dc=com -D "cn=admin,dc=ustack,dc=com" \

-w admin_password

检查test用户是否存在，若存在，则说明创建成功，否则需要使用docker logs查看日志。

配置Harbor使用LDAP认证

修改harbor.cfg文件关于LDAP配置项，如下：

auth_mode = ldap_auth

ldap_url = ldap://42.62.x.x

ldap_basedn = uid=%s,dc=ustack,dc=com


## Harbor 高可用部署

http://blog.csdn.net/u010278923/article/details/77941995



## 注意事项

* 事项一

当我在通过 Ingress 测试 http 模式的 harbor 时，出现了无法上传镜像的问题，见：https://github.com/kubernetes/ingress-nginx/issues/1182 。最后分析原因是 docker 客户端默认始终使用 https （443 端口）来上传镜像，无论你是否指定了 `--insecure-registry` 参数，因此 Ingress 也必须配置成 https 模式的。

```yaml
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: harbor-ingress
  namespace: harbor
  annotations:
    kubernetes.io/ingress.class: "nginx"
spec:
  tls:
  - hosts:
    - dockerhub.cloud.local
  rules:
  - host: dockerhub.cloud.local
    http:
      paths:
      - path: /
        backend:
          serviceName: ui
          servicePort: 80
      - path: /v2
        backend:
          serviceName: registry
          servicePort: 5000
      - path: /service
        backend:
          serviceName: ui
          servicePort: 80
```

* 事项二

由于官方项目管理的原因，导致 `vmware/registry` 镜像设置的配置文件路径可能是 `/etc/docker/registry/config.yml` 或者 `/etc/registry/config.yml`，所以可能导致 `registry-rc.yaml` 挂载的 `config.yml` 和 `/root.crt` 路径错误，以及 `registry-cm.yaml` 指定的 `root.crt` 路径错误，见：https://github.com/vmware/harbor/issues/3637 。另外，即使镜像 tag 相同，在线和离线的镜像它的配置路径也可能不一致，见：https://github.com/vmware/harbor/issues/4425 。

总结的经验：不要使用在线镜像！

```bash
# 查看 CMD 指定的是哪个配置路径
$ docker history --no-trunc vmware/registry:2.6.2-photon
```


## 参考

* [Integration with Kubernetes](https://github.com/vmware/harbor/blob/master/docs/kubernetes_deployment.md)
* [Harbor 实现容器镜像仓库的管理和运维](https://www.cnblogs.com/jicki/articleskkjjj/5801510.html)
* [用 Harbor 和 Kubernetes 构建高可用企业级镜像仓库](http://www.sohu.com/a/130779211_609552)
* [可能是最详细的部署: Docker Registry 企业级私有镜像仓库 Harbor 管理 WEB UI](https://www.jianshu.com/p/7d76850de03f)

> https://github.com/cnych/k8s-repo/tree/master/harbor

* [Harbor 私有仓库简单部署](http://blog.csdn.net/CSDN_duomaomao/article/details/78036331)
* [Harbor 源码分析之组件分析（二）](http://blog.csdn.net/u010278923/article/details/72468791)

* [Harbor用户机制、镜像同步和与Kubernetes的集成实践](https://www.kubernetes.org.cn/1738.html)


* [docker registry token 验证分析](https://www.jianshu.com/p/bdb4066b3cf8)
* [企业级镜像仓库中 Docker Image 命名规范](https://supereagle.github.io/2017/07/26/docker-image-name-convention/)
