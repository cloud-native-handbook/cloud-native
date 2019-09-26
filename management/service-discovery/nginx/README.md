# Nginx ingress controller

## 部署

```bash
# 创建命名空间
$ kubectl apply -f ingress-nginx.namespace.yaml # kubectl create namespace ingress-nginx

# 创建一个默认的 endpoint，用作响应一个 404 页面
$ kubectl -n ingress-nginx apply -f default-http-backend.deploy+svc.ingress-nginx.yaml

# ConfigMap
$ kubectl -n ingress-nginx apply -f nginx-configuration.cm.yaml
$ kubectl -n ingress-nginx apply -f tcp-services-configmap.yaml
$ kubectl -n ingress-nginx apply -f udp-services-configmap.yaml

# RBAC
$ kubectl -n ingress-nginx apply -f rbac.ingress-nginx.yaml

# 同时设置 label 和 taint
$ kubectl taint node kube-node-120 LB=NIC:NoExecute
$ kubectl label node kube-node-120 TAINT.LB=NIC

# 方式一
$ kubectl -n ingress-nginx apply -f nginx-ingress-controller.deploy.ingress-nginx.yaml

# 方式二
$ kubectl -n ingress-nginx apply -f nginx-ingress-controller.ds.ingress-nginx.yaml
```

验证：

```bash
$ kubectl -n ingress-nginx get all -o wide
```


## 简介

* default-backend

default-backend 用于处理所有 nginx-ingress-controller 不能理解的 URL 路径和 host，即没有相应的 Ingress 被提供。default-backend 暴露两个 URL:

  * `/healthz`: 响应状态码 200
  * `/`: 响应状态码 404

* nginx-ingress-controller

| port  | protocol | 说明 |
| 80    | http     | 代理 Ingress 的 http 服务  |
| 443   | https    | 代理 Ingress 的 https 服务 |
| 10254 | http     | 健康检查，路径：/healthz    |


## 应用

ingress-nginx 支持动态添加 TCP/UDP/HTTP 服务，但前提是添加的服务是存在的。如果是 TCP/UDP 服务，ingress-nginx 会根据 ConfigMap 中的配置自动在 LB 节点（也就是 ingress-nginx 所在的节点）上以 hostNetwork 方式启动一个对应的 TCP/UDP 代理，以此实现负载均衡，因此需要避免主机端口冲突。

### UDP 服务

```bash
# 添加一个 kube-dns 的 UDP 服务
$ kubectl -n ingress-nginx edit cm/udp-services
kind: ConfigMap
apiVersion: v1
metadata:
  name: udp-services
  namespace: ingress-nginx
data:
  53: "kube-system/kube-dns:53"
```

```bash
# 到 LB 节点进行校验
$ netstat -upln | grep 53 | grep nginx
udp   0  0  0.0.0.0:53  0.0.0.0:*  18556/nginx: master
udp6  0  0  :::53       :::*       18556/nginx: master
```

### TCP 服务

```bash
# 添加一个 kube-dns 的 TCP 服务
$ kubectl -n ingress-nginx edit cm/tcp-services
kind: ConfigMap
apiVersion: v1
metadata:
  name: tcp-services
  namespace: ingress-nginx
data:
  53: "kube-system/kube-dns:53"
```

```bash
# 到 LB 节点进行校验
$ netstat -tpln | grep 53
tcp   0  0  0.0.0.0:53  0.0.0.0:*  18556/nginx: master
tcp6  0  0  :::53       :::*       18556/nginx: master
```

### Websockets

https://github.com/kubernetes/ingress-nginx#websockets


### HTTP 服务（前后端都是 HTTP 服务）

```bash
# 创建用户命名空间
$ kubectl create namespace http-ingress-ns

# 创建一个 http 服务
$ kubectl -n http-ingress-ns run httpd --image=httpd --port=80
$ kubectl -n http-ingress-ns expose deployment/httpd --name=httpd --port=80 --target-port=80

# 检查服务的运行情况
$ kubectl -n http-ingress-ns get svc,pod -o wide

# 创建对应的 ingress
$ cat <<EOF | kubectl apply -f -
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: httpd
  namespace: http-ingress-ns
  annotations:
    kubernetes.io/ingress.class: "nginx"
    nginx.ingress.kubernetes.io/auth-url: "https://httpbin.org/basic-auth/user/passwd"
spec:
  rules:
  - host: httpd.cloud.local
    http:
      paths:
      - path: /
        backend:
          serviceName: httpd
          servicePort: 80
EOF
```

相关说明：

  * 如果在单一集群有个多个 Ingress controller，必须指定 `kubernetes.io/ingress.class` annotation 来选择一个（对应于 Ingress controller 中的 `--ingress-class` 选项，且该选项是集群唯一的），否则将导致所有 Ingress controller 都满足该 Ingress。
  * 如果不指定 `rules[].host`，可能导致所有请求都转发到该服务上。

测试：

```bash
$ curl -H "HOST: httpd.cloud.local" http://192.168.10.102 # IP 地址为 Nginx Ingress Controller 服务所在的宿主机 IP
```

建议配置 DNS 来解决内部访问的问题。

### HTTPS 服务（Ingress 为 HTTPS 服务，后端为 HTTP 服务）

* 创建服务

```bash
# 创建用户命名空间
$ kubectl create namespace https-ingress-ns

# 创建一个 http 服务
$ kubectl -n https-ingress-ns run tomcat --image=tomcat:9-slim --port=8080
$ kubectl -n https-ingress-ns expose deployment/tomcat --name=tomcat --port=8080 --target-port=8080

# 检查服务的运行情况
$ kubectl -n https-ingress-ns get svc,pod -o wide
```

* 生成证书并创建 Secret

```bash
# 生成证书
$ openssl genrsa -out tomcat.key 2048
$ openssl req -x509 -new -nodes -key tomcat.key -subj "/CN=tomcat.cloud.local" -days 3650 -out tomcat.crt

# 创建 Secret
$ kubectl -n https-ingress-ns create secret tls tomcat-certs --key=tomcat.key --cert=tomcat.crt
```

* 创建 Ingress

```bash
$ cat <<EOF | kubectl apply -f -
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: tomcat
  namespace: https-ingress-ns
  annotations:
    kubernetes.io/ingress.class: "nginx"
spec:
  tls:
  - hosts:
    - tomcat.cloud.local
    secretName: tomcat-certs
  rules:
  - host: tomcat.cloud.local
    http:
      paths:
      - path: /
        backend:
          serviceName: tomcat
          servicePort: 8080
EOF
```

多域名支持（多个域名公用一个 Secret）：

```bash
$ cat <<EOF | kubectl apply -f -
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: tomcat
  namespace: https-ingress-ns
  annotations:
    kubernetes.io/ingress.class: "nginx"
spec:
  tls:
  - hosts:
    - tomcat1.cloud.local
    - tomcat2.cloud.local
    secretName: tomcat-certs
  rules:
  - host: tomcat1.cloud.local
    http:
      paths:
      - path: /
        backend:
          serviceName: tomcat
          servicePort: 8080
  rules:
  - host: tomcat2.cloud.local
    http:
      paths:
      - path: /
        backend:
          serviceName: tomcat
          servicePort: 8080
EOF
```

【注】实际测试发现，不能同时对 http 和 https 服务使用相同的域名，否则会导致 https 的流量导向了 http。


### HTTPS 服务（前后端都是 HTTPS 服务）

（见 kubernetes-dashboard 一节）


## 运行多个 ingress controller


https://github.com/kubernetes/ingress-nginx#running-multiple-ingress-controllers

例如，一个用于服务企业外部流量，一个用于服务企业内部流量：

```bash
$ kubectl create namespace ingress-nginx-internal
args:
- '--ingress-class=nginx-internal'

$ kubectl create namespace ingress-nginx-public
args:
- '--ingress-class=nginx-public'
```


## 参考

* [kubernetes_ingress_letsencrypt](https://feisky.gitbooks.io/kubernetes/practice/ingress_letsencrypt.html)
* [Nginx Ingress Installation Guide](https://github.com/kubernetes/ingress-nginx/tree/master/deploy)
* [Exposing TCP and UDP services](https://github.com/kubernetes/ingress-nginx/blob/master/docs/user-guide/exposing-tcp-udp-services.md)

* [Kubernetes Nginx Ingress Controller 源码分析](http://blog.csdn.net/waltonwang/article/details/76862997)
* [使用 DaemonSet + Taint/Tolerations + NodeSelector 部署 Nginx Ingress Controller](http://blog.csdn.net/waltonwang/article/details/77587003)


> http://www.cnblogs.com/iiiiher/p/8006801.html

> https://mritd.me/2017/03/04/how-to-use-nginx-ingress/?utm_source=tuicool&utm_medium=referral
