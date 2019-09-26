# Kong

Kong 是一个高性能的 API 网关和微服务管理层。

## 部署

* 命名空间

```bash
$ kubectl create namespace kong
```

* PostgreSQL

```bash
$ wget https://raw.githubusercontent.com/Kong/kong-dist-kubernetes/master/postgres.yaml
$ kubectl -n kong create -f postgres.yaml

# Check
$ psql -h postgres.kong.svc.cluster.local -p 5432 -U kong
```

* 准备数据库

如果后端数据库是新建的，跳过该步骤。否则运行下面的迁移 Job。

```bash
$ wget https://raw.githubusercontent.com/Kong/kong-dist-kubernetes/master/kong_migration_postgres.yaml

# 修改 postgres 的命名空间并部署迁移 Job
$ sed -i 's|postgres.default.svc.cluster.local|postgres.kong.svc.cluster.local|g' kong_migration_postgres.yaml
$ kubectl -n kong create -f kong_migration_postgres.yaml

# Job 运行完成后移除
$ kubectl -n kong delete -f kong_migration_postgres.yaml
```

* 部署 Kong

```bash
$ wget -O kong_postgres_external.yaml https://raw.githubusercontent.com/Kong/kong-dist-kubernetes/master/kong_postgres.yaml

# 使用 ExternalIP（需要云服务提供商支持 LoadBalancer 类型的 Service）
$ kubectl -n kong create -f kong_postgres_external.yaml

# 使用 ServiceIP（私有云）
$ kubectl -n kong create -f kong_postgres_internal.yaml
```

* 验证

```bash
$ kubectl -n kong get all

$ curl http://kong-admin.kong.svc.cluster.local:8001
$ curl https://kong-admin-ssl.kong.svc.cluster.local:8444

$ curl http://kong-proxy.kong.svc.cluster.local:8000
$ curl https://kong-proxy-ssl.kong.svc.cluster.local:8443
```

## Helm Charts

> https://github.com/Kong/kong-dist-kubernetes/blob/master/charts/kong/README.md

## 快速入门

> https://getkong.org/docs/0.12.x/getting-started/quickstart/#5-minute-quickstart

## 插件

* [Kong Dashboard](https://github.com/PGBI/kong-dashboard)
* [Kong管理UI -kong-dashboard](http://www.cnblogs.com/xiaoEight/p/5560514.html)

## Kubernetes Ingress Controller for Kong

* [Kubernetes Ingress Controller for Kong](https://github.com/Kong/kubernetes-ingress-controller)

## 参考

* [Kong on Kubernetes managed cluster](https://getkong.org/install/kubernetes)
* [KONG + Kubernetes Deployment](https://github.com/Kong/kong-dist-kubernetes)
* [微服务 Kong](http://www.cnblogs.com/SummerinShire/p/6623730.html)
* [[云框架]KONG API Gateway v1.0](https://www.jianshu.com/p/5400bf1aceda)
* [kong 系列](http://blog.csdn.net/li396864285/article/details/77371385)
