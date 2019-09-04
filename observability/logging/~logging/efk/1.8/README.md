# 在 Kubernetes 1.8 集群部署 EFK

## 部署 EFK

### 修改配置

```bash
$ EFK_URL_PATH=https://raw.githubusercontent.com/kubernetes/kubernetes/release-1.8/cluster/addons/fluentd-elasticsearch

$ wget -O es-service.yaml $EFK_URL_PATH/es-service.yaml
$ wget -O es-statefulset.yaml $EFK_URL_PATH/es-statefulset.yaml
$ wget -O fluentd-es-configmap.yaml $EFK_URL_PATH/fluentd-es-configmap.yaml
$ wget -O fluentd-es-ds.yaml $EFK_URL_PATH/fluentd-es-ds.yaml
$ wget -O kibana-service.yaml $EFK_URL_PATH/kibana-service.yaml
$ wget -O kibana-deployment.yaml $EFK_URL_PATH/kibana-deployment.yaml
```

```bash
# 修改镜像源
$ sed -i "s|gcr.io/google-containers|dockerce|g" es-statefulset.yaml
$ sed -i "s|gcr.io/google-containers|dockerce|g" fluentd-es-ds.yaml
$ sed -i "s|docker.elastic.co/kibana|dockerce|g" kibana-deployment.yaml
```

```bash
# 创建命名空间
$ kubectl create namespace logging

# 修改命名空间
sed -i "s|kube-system|logging|g" es-service.yaml 
sed -i "s|kube-system|logging|g" es-statefulset.yaml
sed -i "s|kube-system|logging|g" fluentd-es-configmap.yaml
sed -i "s|kube-system|logging|g" fluentd-es-ds.yaml
sed -i "s|kube-system|logging|g" kibana-service.yaml
sed -i "s|kube-system|logging|g" kibana-deployment.yaml
```

```bash
# 修改 fluentd 的 nodeSelector
$ sed -i "s|beta.kubernetes.io/fluentd-ds-ready|fluentd-logging|g" fluentd-es-ds.yaml

# 修改 fluentd 的版本
$ sed -i "s|v2.0.1|v2.0.2|g" fluentd-es-ds.yaml
```

### 部署

* es

```bash
# 部署 es
$ kubectl apply -f es-service.yaml
$ kubectl apply -f es-statefulset.yaml

# 检查部署的服务
$ kubectl -n logging get statefulsets,svc,pod -l k8s-app=elasticsearch-logging
NAME                                 DESIRED   CURRENT   AGE
statefulsets/elasticsearch-logging   2         2         27m

NAME                        TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)    AGE
svc/elasticsearch-logging   ClusterIP   172.254.100.30   <none>        9200/TCP   42m

NAME                         READY     STATUS    RESTARTS   AGE
po/elasticsearch-logging-0   1/1       Running   0          27m
po/elasticsearch-logging-1   1/1       Running   0          24m

# 排查日志
$ kubectl -n logging logs -f elasticsearch-logging-0
$ kubectl -n logging logs -f elasticsearch-logging-1
```

* kibana

```bash
# 部署 kibana
$ kubectl apply -f kibana-service.yaml
$ kubectl apply -f kibana-deployment.yaml

# 检查部署的服务
$ kubectl -n logging get deploy,svc,pod -l k8s-app=kibana-logging
NAME                    DESIRED   CURRENT   UP-TO-DATE   AVAILABLE   AGE
deploy/kibana-logging   1         1         1            1           15m

NAME                 TYPE        CLUSTER-IP        EXTERNAL-IP   PORT(S)    AGE
svc/kibana-logging   ClusterIP   172.254.110.108   <none>        5601/TCP   4m

NAME                                READY     STATUS    RESTARTS   AGE
po/kibana-logging-d9f9b9546-qnd89   1/1       Running   0          3m

# 排查日志
$ kubectl -n logging logs -f kibana-logging-d9f9b9546-qnd89
```

* fluentd

```bash
# 标记需要部署 fluentd 的节点
$ kubectl label nodes <node-name> fluentd-logging=true --overwrite

# 如果希望所有节点都部署 fluentd 可以删除 fluentd-es-ds.yaml 中的 nodeSelector，或者像下面一样标记所有节点
$ k8snodes=$(kubectl get node | awk '{print $1}')
$ for node in $k8snodes; do 
  if [ "$node" != "NAME" ]; then
    echo $node 
    kubectl label nodes $node fluentd-logging=true --overwrite
  fi;
done

# 如果 Master 也加入了集群并且设置了 taint，需要在 fluentd-es-ds.yaml 的 DaemonSet.spec.template.spec.tolerations 中添加 toleration 才能让 fluentd 部署到 Master 节点（需要根据设置的 taint 来设置 toleration）
# tolerations
# - key: node-role.kubernetes.io
#    value: master
#    effect: NoSchedule

# 部署 fluentd
$ kubectl apply -f fluentd-es-configmap.yaml
$ kubectl apply -f fluentd-es-ds.yaml

# 检查部署的服务
$ kubectl -n logging get daemonset -l k8s-app=fluentd-es
NAME                   DESIRED   CURRENT   READY     UP-TO-DATE   AVAILABLE   NODE SELECTOR          AGE
ds/fluentd-es-v2.0.1   7         7         7         7            7           fluentd-logging=true   3m
```

>  注意：Elasticsearch 的数据并没有持久化，当 Pod 重新调度后数据可能会丢失；


## Elasticsearch

### es-service.yaml 原文件

```yaml
apiVersion: v1
kind: Service
metadata:
  name: elasticsearch-logging
  namespace: kube-system
  labels:
    k8s-app: elasticsearch-logging
    kubernetes.io/cluster-service: "true"
    addonmanager.kubernetes.io/mode: Reconcile
    kubernetes.io/name: "Elasticsearch"
spec:
  ports:
  - port: 9200
    protocol: TCP
    targetPort: db
  selector:
    k8s-app: elasticsearch-logging
```

### es-statefulset.yaml 原文件

```yaml
# RBAC authn and authz
apiVersion: v1
kind: ServiceAccount
metadata:
  name: elasticsearch-logging
  namespace: kube-system
  labels:
    k8s-app: elasticsearch-logging
    kubernetes.io/cluster-service: "true"
    addonmanager.kubernetes.io/mode: Reconcile
---
kind: ClusterRole
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: elasticsearch-logging
  labels:
    k8s-app: elasticsearch-logging
    kubernetes.io/cluster-service: "true"
    addonmanager.kubernetes.io/mode: Reconcile
rules:
- apiGroups:
  - ""
  resources:
  - "services"
  - "namespaces"
  - "endpoints"
  verbs:
  - "get"
---
kind: ClusterRoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  namespace: kube-system
  name: elasticsearch-logging
  labels:
    k8s-app: elasticsearch-logging
    kubernetes.io/cluster-service: "true"
    addonmanager.kubernetes.io/mode: Reconcile
subjects:
- kind: ServiceAccount
  name: elasticsearch-logging
  namespace: kube-system
  apiGroup: ""
roleRef:
  kind: ClusterRole
  name: elasticsearch-logging
  apiGroup: ""
---
# Elasticsearch deployment itself
apiVersion: apps/v1beta1
kind: StatefulSet
metadata:
  name: elasticsearch-logging
  namespace: kube-system
  labels:
    k8s-app: elasticsearch-logging
    version: v5.5.1
    kubernetes.io/cluster-service: "true"
    addonmanager.kubernetes.io/mode: Reconcile
spec:
  serviceName: elasticsearch-logging
  replicas: 2
  selector:
    matchLabels:
      k8s-app: elasticsearch-logging
      version: v5.5.1
  template:
    metadata:
      labels:
        k8s-app: elasticsearch-logging
        version: v5.5.1
        kubernetes.io/cluster-service: "true"
    spec:
      serviceAccountName: elasticsearch-logging
      containers:
      - image: gcr.io/google-containers/elasticsearch:v5.5.1-1
        name: elasticsearch-logging
        resources:
          # need more cpu upon initialization, therefore burstable class
          limits:
            cpu: 1000m
          requests:
            cpu: 100m
        ports:
        - containerPort: 9200
          name: db
          protocol: TCP
        - containerPort: 9300
          name: transport
          protocol: TCP
        volumeMounts:
        - name: elasticsearch-logging
          mountPath: /data
        env:
        - name: "NAMESPACE"
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
      volumes:
      - name: elasticsearch-logging
        emptyDir: {}
      # Elasticsearch requires vm.max_map_count to be at least 262144.
      # If your OS already sets up this number to a higher value, feel free
      # to remove this init container.
      initContainers:
      - image: alpine:3.6
        command: ["/sbin/sysctl", "-w", "vm.max_map_count=262144"]
        name: elasticsearch-logging-init
        securityContext:
          privileged: true
```


## Fluentd

### fluentd-es-configmap.yaml 原文件

```yaml
kind: ConfigMap
apiVersion: v1
data:
  containers.input.conf: |-
    <source>
      type tail
      path /var/log/containers/*.log
      pos_file /var/log/es-containers.log.pos
      time_format %Y-%m-%dT%H:%M:%S.%NZ
      tag kubernetes.*
      format json
      read_from_head true
    </source>
  system.input.conf: |-
    # Example:
    # 2015-12-21 23:17:22,066 [salt.state       ][INFO    ] Completed state [net.ipv4.ip_forward] at time 23:17:22.066081
    <source>
      type tail
      format /^(?<time>[^ ]* [^ ,]*)[^\[]*\[[^\]]*\]\[(?<severity>[^ \]]*) *\] (?<message>.*)$/
      time_format %Y-%m-%d %H:%M:%S
      path /var/log/salt/minion
      pos_file /var/log/es-salt.pos
      tag salt
    </source>

    # Example:
    # Dec 21 23:17:22 gke-foo-1-1-4b5cbd14-node-4eoj startupscript: Finished running startup script /var/run/google.startup.script
    <source>
      type tail
      format syslog
      path /var/log/startupscript.log
      pos_file /var/log/es-startupscript.log.pos
      tag startupscript
    </source>

    # Examples:
    # time="2016-02-04T06:51:03.053580605Z" level=info msg="GET /containers/json"
    # time="2016-02-04T07:53:57.505612354Z" level=error msg="HTTP Error" err="No such image: -f" statusCode=404
    <source>
      type tail
      format /^time="(?<time>[^)]*)" level=(?<severity>[^ ]*) msg="(?<message>[^"]*)"( err="(?<error>[^"]*)")?( statusCode=($<status_code>\d+))?/
      path /var/log/docker.log
      pos_file /var/log/es-docker.log.pos
      tag docker
    </source>

    # Example:
    # 2016/02/04 06:52:38 filePurge: successfully removed file /var/etcd/data/member/wal/00000000000006d0-00000000010a23d1.wal
    <source>
      type tail
      # Not parsing this, because it doesn't have anything particularly useful to
      # parse out of it (like severities).
      format none
      path /var/log/etcd.log
      pos_file /var/log/es-etcd.log.pos
      tag etcd
    </source>

    # Multi-line parsing is required for all the kube logs because very large log
    # statements, such as those that include entire object bodies, get split into
    # multiple lines by glog.

    # Example:
    # I0204 07:32:30.020537    3368 server.go:1048] POST /stats/container/: (13.972191ms) 200 [[Go-http-client/1.1] 10.244.1.3:40537]
    <source>
      type tail
      format multiline
      multiline_flush_interval 5s
      format_firstline /^\w\d{4}/
      format1 /^(?<severity>\w)(?<time>\d{4} [^\s]*)\s+(?<pid>\d+)\s+(?<source>[^ \]]+)\] (?<message>.*)/
      time_format %m%d %H:%M:%S.%N
      path /var/log/kubelet.log
      pos_file /var/log/es-kubelet.log.pos
      tag kubelet
    </source>

    # Example:
    # I1118 21:26:53.975789       6 proxier.go:1096] Port "nodePort for kube-system/default-http-backend:http" (:31429/tcp) was open before and is still needed
    <source>
      type tail
      format multiline
      multiline_flush_interval 5s
      format_firstline /^\w\d{4}/
      format1 /^(?<severity>\w)(?<time>\d{4} [^\s]*)\s+(?<pid>\d+)\s+(?<source>[^ \]]+)\] (?<message>.*)/
      time_format %m%d %H:%M:%S.%N
      path /var/log/kube-proxy.log
      pos_file /var/log/es-kube-proxy.log.pos
      tag kube-proxy
    </source>

    # Example:
    # I0204 07:00:19.604280       5 handlers.go:131] GET /api/v1/nodes: (1.624207ms) 200 [[kube-controller-manager/v1.1.3 (linux/amd64) kubernetes/6a81b50] 127.0.0.1:38266]
    <source>
      type tail
      format multiline
      multiline_flush_interval 5s
      format_firstline /^\w\d{4}/
      format1 /^(?<severity>\w)(?<time>\d{4} [^\s]*)\s+(?<pid>\d+)\s+(?<source>[^ \]]+)\] (?<message>.*)/
      time_format %m%d %H:%M:%S.%N
      path /var/log/kube-apiserver.log
      pos_file /var/log/es-kube-apiserver.log.pos
      tag kube-apiserver
    </source>

    # Example:
    # I0204 06:55:31.872680       5 servicecontroller.go:277] LB already exists and doesn't need update for service kube-system/kube-ui
    <source>
      type tail
      format multiline
      multiline_flush_interval 5s
      format_firstline /^\w\d{4}/
      format1 /^(?<severity>\w)(?<time>\d{4} [^\s]*)\s+(?<pid>\d+)\s+(?<source>[^ \]]+)\] (?<message>.*)/
      time_format %m%d %H:%M:%S.%N
      path /var/log/kube-controller-manager.log
      pos_file /var/log/es-kube-controller-manager.log.pos
      tag kube-controller-manager
    </source>

    # Example:
    # W0204 06:49:18.239674       7 reflector.go:245] pkg/scheduler/factory/factory.go:193: watch of *api.Service ended with: 401: The event in requested index is outdated and cleared (the requested history has been cleared [2578313/2577886]) [2579312]
    <source>
      type tail
      format multiline
      multiline_flush_interval 5s
      format_firstline /^\w\d{4}/
      format1 /^(?<severity>\w)(?<time>\d{4} [^\s]*)\s+(?<pid>\d+)\s+(?<source>[^ \]]+)\] (?<message>.*)/
      time_format %m%d %H:%M:%S.%N
      path /var/log/kube-scheduler.log
      pos_file /var/log/es-kube-scheduler.log.pos
      tag kube-scheduler
    </source>

    # Example:
    # I1104 10:36:20.242766       5 rescheduler.go:73] Running Rescheduler
    <source>
      type tail
      format multiline
      multiline_flush_interval 5s
      format_firstline /^\w\d{4}/
      format1 /^(?<severity>\w)(?<time>\d{4} [^\s]*)\s+(?<pid>\d+)\s+(?<source>[^ \]]+)\] (?<message>.*)/
      time_format %m%d %H:%M:%S.%N
      path /var/log/rescheduler.log
      pos_file /var/log/es-rescheduler.log.pos
      tag rescheduler
    </source>

    # Example:
    # I0603 15:31:05.793605       6 cluster_manager.go:230] Reading config from path /etc/gce.conf
    <source>
      type tail
      format multiline
      multiline_flush_interval 5s
      format_firstline /^\w\d{4}/
      format1 /^(?<severity>\w)(?<time>\d{4} [^\s]*)\s+(?<pid>\d+)\s+(?<source>[^ \]]+)\] (?<message>.*)/
      time_format %m%d %H:%M:%S.%N
      path /var/log/glbc.log
      pos_file /var/log/es-glbc.log.pos
      tag glbc
    </source>

    # Example:
    # I0603 15:31:05.793605       6 cluster_manager.go:230] Reading config from path /etc/gce.conf
    <source>
      type tail
      format multiline
      multiline_flush_interval 5s
      format_firstline /^\w\d{4}/
      format1 /^(?<severity>\w)(?<time>\d{4} [^\s]*)\s+(?<pid>\d+)\s+(?<source>[^ \]]+)\] (?<message>.*)/
      time_format %m%d %H:%M:%S.%N
      path /var/log/cluster-autoscaler.log
      pos_file /var/log/es-cluster-autoscaler.log.pos
      tag cluster-autoscaler
    </source>

    # Logs from systemd-journal for interesting services.
    <source>
      type systemd
      filters [{ "_SYSTEMD_UNIT": "docker.service" }]
      pos_file /var/log/gcp-journald-docker.pos
      read_from_head true
      tag docker
    </source>

    <source>
      type systemd
      filters [{ "_SYSTEMD_UNIT": "kubelet.service" }]
      pos_file /var/log/gcp-journald-kubelet.pos
      read_from_head true
      tag kubelet
    </source>

    <source>
      type systemd
      filters [{ "_SYSTEMD_UNIT": "node-problem-detector.service" }]
      pos_file /var/log/gcp-journald-node-problem-detector.pos
      read_from_head true
      tag node-problem-detector
    </source>
  forward.input.conf: |-
    # Takes the messages sent over TCP
    <source>
      type forward
    </source>
  monitoring.conf: |-
    # Prometheus Exporter Plugin
    # input plugin that exports metrics
    <source>
      @type prometheus
    </source>

    <source>
      @type monitor_agent
    </source>

    # input plugin that collects metrics from MonitorAgent
    <source>
      @type prometheus_monitor
      <labels>
        host ${hostname}
      </labels>
    </source>

    # input plugin that collects metrics for output plugin
    <source>
      @type prometheus_output_monitor
      <labels>
        host ${hostname}
      </labels>
    </source>

    # input plugin that collects metrics for in_tail plugin
    <source>
      @type prometheus_tail_monitor
      <labels>
        host ${hostname}
      </labels>
    </source>
  output.conf: |-
    # Enriches records with Kubernetes metadata
    <filter kubernetes.**>
      type kubernetes_metadata
    </filter>

    <match **>
       type elasticsearch
       log_level info
       include_tag_key true
       host elasticsearch-logging
       port 9200
       logstash_format true
       # Set the chunk limits.
       buffer_chunk_limit 2M
       buffer_queue_limit 8
       flush_interval 5s
       # Never wait longer than 5 minutes between retries.
       max_retry_wait 30
       # Disable the limit on the number of retries (retry forever).
       disable_retry_limit
       # Use multiple threads for processing.
       num_threads 2
    </match>
metadata:
  name: fluentd-es-config-v0.1.0
  namespace: kube-system
  labels:
    addonmanager.kubernetes.io/mode: Reconcile
```

### fluentd-es-ds.yaml

添加了 toleration，以便 fluentd 可以部署都 Master 节点上；另外，修改了 nodeSelector：

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: fluentd-es
  namespace: kube-system
  labels:
    k8s-app: fluentd-es
    kubernetes.io/cluster-service: "true"
    addonmanager.kubernetes.io/mode: Reconcile
---
kind: ClusterRole
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: fluentd-es
  labels:
    k8s-app: fluentd-es
    kubernetes.io/cluster-service: "true"
    addonmanager.kubernetes.io/mode: Reconcile
rules:
- apiGroups:
  - ""
  resources:
  - "namespaces"
  - "pods"
  verbs:
  - "get"
  - "watch"
  - "list"
---
kind: ClusterRoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: fluentd-es
  labels:
    k8s-app: fluentd-es
    kubernetes.io/cluster-service: "true"
    addonmanager.kubernetes.io/mode: Reconcile
subjects:
- kind: ServiceAccount
  name: fluentd-es
  namespace: kube-system
  apiGroup: ""
roleRef:
  kind: ClusterRole
  name: fluentd-es
  apiGroup: ""
---
apiVersion: extensions/v1beta1
kind: DaemonSet
metadata:
  name: fluentd-es-v2.0.1
  namespace: kube-system
  labels:
    k8s-app: fluentd-es
    version: v2.0.1
    kubernetes.io/cluster-service: "true"
    addonmanager.kubernetes.io/mode: Reconcile
spec:
  template:
    metadata:
      labels:
        k8s-app: fluentd-es
        kubernetes.io/cluster-service: "true"
        version: v2.0.1
      # This annotation ensures that fluentd does not get evicted if the node
      # supports critical pod annotation based priority scheme.
      # Note that this does not guarantee admission on the nodes (#40573).
      annotations:
        scheduler.alpha.kubernetes.io/critical-pod: ''
    spec:
      serviceAccountName: fluentd-es
      containers:
      - name: fluentd-es
        image: gcr.io/google-containers/fluentd-elasticsearch:v2.0.1
        env:
        - name: FLUENTD_ARGS
          value: --no-supervisor -q
        resources:
          limits:
            memory: 500Mi
          requests:
            cpu: 100m
            memory: 200Mi
        volumeMounts:
        - name: varlog
          mountPath: /var/log
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
        - name: libsystemddir
          mountPath: /host/lib
          readOnly: true
        - name: config-volume
          mountPath: /etc/fluent/config.d
      nodeSelector:
        fluentd-logging: "true"
      terminationGracePeriodSeconds: 30
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
      - name: varlibdockercontainers
        hostPath:
          path: /var/lib/docker/containers
      # It is needed to copy systemd library to decompress journals
      - name: libsystemddir
        hostPath:
          path: /usr/lib64
      - name: config-volume
        configMap:
          name: fluentd-es-config-v0.1.0
```


## Kibana

### kibana-service.yaml 原文件

```yaml
apiVersion: v1
kind: Service
metadata:
  name: kibana-logging
  namespace: kube-system
  labels:
    k8s-app: kibana-logging
    kubernetes.io/cluster-service: "true"
    addonmanager.kubernetes.io/mode: Reconcile
    kubernetes.io/name: "Kibana"
spec:
  ports:
  - port: 5601
    protocol: TCP
    targetPort: ui
  selector:
    k8s-app: kibana-logging
```

### kibana-deployment.yaml 原文件

```yaml
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: kibana-logging
  namespace: kube-system
  labels:
    k8s-app: kibana-logging
    kubernetes.io/cluster-service: "true"
    addonmanager.kubernetes.io/mode: Reconcile
spec:
  replicas: 1
  selector:
    matchLabels:
      k8s-app: kibana-logging
  template:
    metadata:
      labels:
        k8s-app: kibana-logging
    spec:
      containers:
      - name: kibana-logging
        image: docker.elastic.co/kibana/kibana:5.5.1
        resources:
          # need more cpu upon initialization, therefore burstable class
          limits:
            cpu: 1000m
          requests:
            cpu: 100m
        env:
          - name: ELASTICSEARCH_URL
            value: http://elasticsearch-logging:9200
          - name: SERVER_BASEPATH
            value: /api/v1/proxy/namespaces/kube-system/services/kibana-logging
          - name: XPACK_MONITORING_ENABLED
            value: "false"
          - name: XPACK_SECURITY_ENABLED
            value: "false"
        ports:
        - containerPort: 5601
          name: ui
          protocol: TCP
```


## 参考

* [fluentd-elasticsearch](https://github.com/kubernetes/kubernetes/tree/release-1.8/cluster/addons/fluentd-elasticsearch)
* [Logging Using Elasticsearch and Kibana](https://kubernetes.io/docs/tasks/debug-application-cluster/logging-elasticsearch-kibana/)