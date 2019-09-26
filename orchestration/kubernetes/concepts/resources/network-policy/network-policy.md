# Kubernetes 资源对象之 NetworkPolicy

## NetworkPolicy 资源对象

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: test-network-policy
  namespace: default
spec:
  podSelector:
    matchLabels:
      role: db
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - ipBlock:
        cidr: 172.17.0.0/16
        except:
        - 172.17.1.0/24
    - namespaceSelector:
        matchLabels:
          project: myproject
    - podSelector:
        matchLabels:
          role: frontend
    ports:
    - protocol: TCP
      port: 6379
  egress:
  - to:
    - ipBlock:
        cidr: 10.0.0.0/24
    ports:
    - protocol: TCP
      port: 5978
```

分析：

**policyTypes**：该字段表示该策略是否使用定义的 NetworkPolicyIngressRule 和 NetworkPolicyEgressRule。 无论是否设置了 NetworkPolicyIngressRule （`spec.ingress`）

## 总结

如果某个字段的值是 `{}`，则表示 `允许所有`；如果某个字段缺省了，则表示 `拒绝所有`。例如，允许 "192.168.8.0/24" 网段以及其他所有命名空间的 Pod 访问 default 命名空间的所有 Pod 的示例如下：

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: base
  namespace: default
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - ipBlock:
        cidr: 192.168.8.0/24
    - podSelector: {} # 缺省了将导致该命名空间的其他 Pod 无法访问
    - namespaceSelector: {} # 缺省将导致其他命名空间的所有 Pod 都无法访问
   engress: {} # 缺省将导致所有 Pod 无法访问外部服务
```

## 参考

* [Declare Network Policy](https://kubernetes.io/docs/tasks/administer-cluster/declare-network-policy/)
