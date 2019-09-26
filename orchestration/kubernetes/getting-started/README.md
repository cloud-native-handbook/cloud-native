# Kubernetes 入门实战篇

<!--
## Todo

1. Kubernetes 简介
   1. Kubernetes 是什么？
   2. Kubernetes 不是什么？
2. Kubernetes 架构、组件、集群
3. Kubernetes 常用对象/基本对象
   1. Pod
   2. Deployment
   3. StatefulSet
   4. Service （Headless） 与 Endpoints
   5. Namespace
4. Example
   1. Pod
      1. 部署：
         1. YAML & JSON（YAML 可以注释）
         2. kubectl apply -f & kubectl create -f
      2. 查看：kubectl get pod/<xxx>
      3. 日志：kubectl logs -f <xxx>
      4. 描述：kubectl describe pod/<xxx>
      5. 执行命令：kubectl exec pod/<xxx> ps aux
      6. 对比 kubectl 命令和 docker 命令
      7. 最后删除：kubectl delete ...
   2. Deployment
      1. 部署 kubectl apply -f
      2. 属性：多副本、Pod 带多标签
      3. 尝试删除一个 Pod 查看恢复能力
      4. 最后指出可以用 kubectl run 代替
   3. Service
      1. 为 “步骤 2” 部署的 Deployment 中的 Pod 创建 Service：kubectl apply -f
      2. 简述 Type？
      3. targetPort 可以是 Pod 的 containers[].ports[].name 或 containers[].ports[].containerPort
      4. 扩容 kubectl scale（kubectl apply -f）-> Service 会自动关联新增的 Pod
      5. 最后指出可以用 kubectl expose 代替上面的步骤
-->
