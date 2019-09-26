# Zipkin

## 部署

```bash
$ kubectl create namespace zipkin

$ kubectl -n zipkin apply -f https://raw.githubusercontent.com/linkerd/linkerd-examples/master/k8s-daemonset/k8s/zipkin.yml

```

```bash
# Deploy zipkin.
kubectl apply -f https://raw.githubusercontent.com/linkerd/linkerd-examples/master/k8s-daemonset/k8s/zipkin.yml

# Deploy linkerd for zipkin.
#kubectl apply -f https://raw.githubusercontent.com/linkerd/linkerd-examples/master/k8s-daemonset/k8s/linkerd-zipkin.yml

# Get zipkin endpoint.
ZIPKIN_LB=$(kubectl get svc zipkin -o jsonpath="{.status.loadBalancer.ingress[0].*}")
echo "open http://$ZIPKIN_LB in browser"
```
