# Mysql on kubernetes

## 部署

```bash
$ kubectl apply -f database.namespace.yaml
$ kubectl apply -f rbd-secret-admin.secret.database.yaml

$ kubectl apply -f mysql.secret.database.yaml

$ kubectl apply -f mysql.svc+pvc+deploy.database.yaml
```


## 测试

```bash
$ # 进入容器内部测试
$ kubectl exec -it mysql-625280278-6jf5r -n database -- mysql -u root -p123456

$ # 对于一个 Pod 的 Headless Service 可以直接通过 Service DNS 解析到 Pod 的 IP 地址
$ kubectl run -it --rm --image=mysql:5.6 --restart=Never mysql-client -- mysql -h mysql.database.svc -p123456
```

## 参考

* [Run a Single-Instance Stateful Application](https://kubernetes.io/docs/tasks/run-application/run-single-instance-stateful-application/)
* [Deploying WordPress and MySQL with Persistent Volumes](https://kubernetes.io/docs/tutorials/stateful-application/mysql-wordpress-persistent-volume/)
* [mysql-wordpress-pd](https://github.com/kubernetes/examples/tree/master/mysql-wordpress-pd)
