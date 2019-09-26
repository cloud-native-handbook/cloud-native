# kuill

```bash
$ git clone https://github.com/bitnami-labs/helm-crd.git
$ cd kuill/helm/kuill

# 安装 Chart
$ helm install . --name kuill --dry-run --debug
$ helm install . --name kuill

# RBAC
$ kubectl patch deploy/kuill-kuill -p '{"spec": {"template": {"spec": {"serviceAccount": "kuill-kuill-sa"}}}}}'
$ kubectl patch deploy/kuill-kuill -p '{"spec": {"template": {"spec": {"serviceAccount": "default"}}}}}'
```
