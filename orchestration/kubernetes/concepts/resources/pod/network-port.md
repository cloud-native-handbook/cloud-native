# Pod 容器的网络和端口

## hostNetwork & hostPort

```bash
# 不支持
$ cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: nginx
spec:
  containers:
  - name: nginx
    image: nginx:alpine
    ports:
    - containerPort: 80
      hostPort: 8888
EOF
```

```bash
# 如果使用 hostNetwork，containerPort 和 hostPort 必须相同
$ cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: nginx
spec:
  hostNetwork: true
  containers:
  - name: nginx
    image: nginx:alpine
    ports:
    - containerPort: 80
      hostPort: 80
EOF
```
