# Annotations

https://github.com/kubernetes/ingress-nginx/blob/master/docs/user-guide/annotations.md

## 外部认证

https://github.com/kubernetes/ingress-nginx/blob/master/docs/user-guide/annotations.md#external-authentication
https://github.com/kubernetes/ingress-nginx/blob/master/docs/examples/external-auth/oauth2-proxy.yaml

```bash
$ cat <<EOF | kubectl apply -f -
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  labels:
    k8s-app: oauth2-proxy
  name: oauth2-proxy
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      k8s-app: oauth2-proxy
  template:
    metadata:
      labels:
        k8s-app: oauth2-proxy
    spec:
      containers:
      - args:
        - --provider=github
        - --email-domain=*
        - --upstream=file:///dev/null
        - --http-address=0.0.0.0:4180
        # Register a new application
        # https://github.com/settings/applications/new
        env:
        - name: OAUTH2_PROXY_CLIENT_ID
          value: <Client ID>
        - name: OAUTH2_PROXY_CLIENT_SECRET
          value: <Client Secret>
        # python -c 'import os,base64; print base64.b64encode(os.urandom(16))'
        - name: OAUTH2_PROXY_COOKIE_SECRET
          value: SECRET
        image: docker.io/colemickens/oauth2_proxy:latest
        imagePullPolicy: Always
        name: oauth2-proxy
        ports:
        - containerPort: 4180
          protocol: TCP
---
apiVersion: v1
kind: Service
metadata:
  labels:
    k8s-app: oauth2-proxy
  name: oauth2-proxy
  namespace: kube-system
spec:
  ports:
  - name: http
    port: 4180
    protocol: TCP
    targetPort: 4180
  selector:
    k8s-app: oauth2-proxy
EOF
```

```bash
$ cat <<EOF | kubectl apply -f -
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: oauth2-proxy
  namespace: kube-system
spec:
  tls:
  - hosts: oauth2proxy.cloud.local
    secretName: __INGRESS_SECRET__
  rules:
  - host: oauth2proxy.cloud.local
    http:
      paths:
      - backend:
          serviceName: oauth2-proxy
          servicePort: 4180
        path: /oauth2
EOF
```