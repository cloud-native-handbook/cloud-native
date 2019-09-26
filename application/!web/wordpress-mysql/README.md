## Wordpress


## 部署

```bash
$ kubectl apply -f web.namespace.yaml

$ kubectl apply -f mysql-pass.secret.web.yaml

$ kubectl apply -f rbd-secret-admin.secret.web.yaml
$ kubectl apply -f wordpress.svc+pvc+deploy.web.yaml

$ kubectl apply -f wordpress.ingress.yaml
```


## 参考

* [Deploying WordPress and MySQL with Persistent Volumes](https://kubernetes.io/docs/tutorials/stateful-application/mysql-wordpress-persistent-volume/)
* [mysql-wordpress-pd](https://github.com/kubernetes/examples/tree/master/mysql-wordpress-pd)
