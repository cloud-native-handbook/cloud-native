# PostgreSQL


## 部署

```bash
$ kubectl apply -f postgres.namespace.yaml
$ kubectl apply -f rbd-secret-admin.secret.postgres.yaml

$ kubectl apply -f postgres-secret.secret.postgres.yaml
$ kubectl apply -f postgres.pvc+deploy.postgres.yaml

$ kubectl apply -f postgres.svc.postgres.yaml
```


## 测试

```bash
$ kubectl -n postgres exec -it postgres-2833254039-grn7t -- psql -h localhost -U postgres -p 5432
psql (10.0)
Type "help" for help.

postgres=# SELECT 1;
 ?column? 
----------
        1
(1 row)
```

## 参考
