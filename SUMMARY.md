# SUMMARY

- [简介](README.md)

## 应用

- [application](application/README.md)

- [!edge-computing](application/!edge-computing/README.md)
    - [kubeedge](application/!edge-computing/kubeedge/README.md)
- [!web](application/!web/README.md)
    - [javaee](application/!web/javaee/README.md)
    - [javaweb](application/!web/javaweb/README.md)
    - [nodejs-mongodb](application/!web/nodejs-mongodb/README.md)
    - [ruby-on-rails](application/!web/ruby-on-rails/README.md)
    - [socket.io](application/!web/socket.io/README.md)
    - [spring-boot](application/!web/spring-boot/README.md)
    - [spring-cloud](application/!web/spring-cloud/README.md)
    - [wordpress-mysql](application/!web/wordpress-mysql/README.md)
- [app-definition&image-build](application/app-definition&image-build/README.md)
    - [应用管理](application/app-definition&image-build/app-management.md)
    - [docker-compose](application/app-definition&image-build/docker-compose/README.md)
    - [draft](application/app-definition&image-build/draft/README.md)
    - [gitkube](application/app-definition&image-build/gitkube/README.md)
    - [helm](application/app-definition&image-build/helm/README.md)
        - [Kubernetes Helm](application/app-definition&image-build/helm/helm.md)
        - [Kubeapps](application/app-definition&image-build/helm/kubeapps.md)
        - [Monocular](application/app-definition&image-build/helm/monocular.md)
    - [kaniko](application/app-definition&image-build/kaniko/README.md)
    - [open-api](application/app-definition&image-build/open-api/README.md)
    - [operator-framework](application/app-definition&image-build/operator-framework/README.md)
        - [operators](application/app-definition&image-build/operator-framework/operators/README.md)
    - [packer](application/app-definition&image-build/packer/README.md)
    - [service-broker](application/app-definition&image-build/service-broker/README.md)
    - [skaffold](application/app-definition&image-build/skaffold/README.md)
    - [~ksonnet](application/app-definition&image-build/~ksonnet/README.md)
    - [~kubevirt](application/app-definition&image-build/~kubevirt/README.md)
    - [~kustomize](application/app-definition&image-build/~kustomize/README.md)
    - [~service-catalog](application/app-definition&image-build/~service-catalog/README.md)
        - [Service Catalog](application/app-definition&image-build/~service-catalog/service-broker.md)
- [ci&cd](application/ci&cd/README.md)
    - [ContainerOps](application/ci&cd/ContainerOps/README.md)
    - [appveyor](application/ci&cd/appveyor/README.md)
    - [持续集成（Continuous Integration）](application/ci&cd/ci.md)
    - [circleci](application/ci&cd/circleci/README.md)
    - [Devops](application/ci&cd/devops.md)
    - [drone](application/ci&cd/drone/README.md)
    - [flagger](application/ci&cd/flagger/README.md)
    - [gitkube](application/ci&cd/gitkube/README.md)
    - [gitlab](application/ci&cd/gitlab/README.md)
    - [jenkins](application/ci&cd/jenkins/README.md)
        - [全局工具配置](application/ci&cd/jenkins/configureTools.md)
        - [部署 Jenkins Server](application/ci&cd/jenkins/jenkins-deployment.md)
        - [Jenkins X](application/ci&cd/jenkins/jenkins-x.md)
        - [Jenkins Pipeline](application/ci&cd/jenkins/pipeline.md)
        - [plugin](application/ci&cd/jenkins/plugin/README.md)
            - [Blue Ocean](application/ci&cd/jenkins/plugin/blue-ocean.md)
            - [build-name-setter](application/ci&cd/jenkins/plugin/build-name-setter.md)
            - [Docker Pipeline](application/ci&cd/jenkins/plugin/docker-pipeline.md)
            - [Kubernetes](application/ci&cd/jenkins/plugin/kubernetes.md)
            - [LDAP](application/ci&cd/jenkins/plugin/ldap.md)
            - [Role-based Authorization Strategy](application/ci&cd/jenkins/plugin/role-based-authorization-strategy.md)
            - [Yet Another Docker](application/ci&cd/jenkins/plugin/yet-another-docker.md)
    - [jenkinsx](application/ci&cd/jenkinsx/README.md)
    - [spinnaker](application/ci&cd/spinnaker/README.md)
    - [tekton-pipelines](application/ci&cd/tekton-pipelines/README.md)
    - [tekton](application/ci&cd/tekton/README.md)
    - [travis-ci](application/ci&cd/travis-ci/README.md)
    - [weave-flux](application/ci&cd/weave-flux/README.md)
    - [wercker](application/ci&cd/wercker/README.md)
    - [~dockerhub](application/ci&cd/~dockerhub/README.md)
    - [~gitlab-cicd](application/ci&cd/~gitlab-cicd/README.md)
        - [gitlab-runner-docker](application/ci&cd/~gitlab-cicd/gitlab-runner-docker/README.md)
        - [gitlab-runner-kubernetes](application/ci&cd/~gitlab-cicd/gitlab-runner-kubernetes/README.md)
    - [~wercker](application/ci&cd/~wercker/README.md)
- [database](application/database/README.md)
    - [cassandra]()
        - [1.6](application/database/cassandra/1.6/README.md)
        - [1.8](application/database/cassandra/1.8/README.md)
        - [bare-metal](application/database/cassandra/bare-metal/README.md)
    - [couchbase](application/database/couchbase/README.md)
    - [hadoop]()
        - [Hadoop 1 & Hadoop 2 & Hadoop 3](application/database/hadoop/1-vs-2-vs-3.md)
        - [hdfs]()
            - [by-service](application/database/hadoop/hdfs/by-service/README.md)
            - [k8s-1.6]()
                - [hdfs-2.7.3](application/database/hadoop/hdfs/k8s-1.6/hdfs-2.7.3/README.md)
            - [k8s-1.8]()
                - [hdfs-2.7.5-ha](application/database/hadoop/hdfs/k8s-1.8/hdfs-2.7.5-ha/README.md)
                - [hdfs-2.7.5](application/database/hadoop/hdfs/k8s-1.8/hdfs-2.7.5/README.md)
                - [hdfs-3.1.0](application/database/hadoop/hdfs/k8s-1.8/hdfs-3.1.0/README.md)
        - [yarn]()
            - [k8s-1.6](application/database/hadoop/yarn/k8s-1.6/README.md)
            - [k8s-1.8]()
                - [yarn-2.7.5-ha](application/database/hadoop/yarn/k8s-1.8/yarn-2.7.5-ha/README.md)
                - [yarn-2.7.5](application/database/hadoop/yarn/k8s-1.8/yarn-2.7.5/README.md)
    - [mariadb](application/database/mariadb/README.md)
    - [mongodb](application/database/mongodb/README.md)
    - [mysql]()
        - [mysql-cge](application/database/mysql/mysql-cge/README.md)
        - [mysql-cluster](application/database/mysql/mysql-cluster/README.md)
        - [mysql-galera](application/database/mysql/mysql-galera/README.md)
        - [mysql](application/database/mysql/mysql/README.md)
    - [neo4j](application/database/neo4j/README.md)
    - [postgre-sql](application/database/postgre-sql/README.md)
        - [cluster](application/database/postgre-sql/cluster/README.md)
    - [redis](application/database/redis/README.md)
        - [statefulset](application/database/redis/statefulset/README.md)
            - [conf]()
    - [scylla](application/database/scylla/README.md)
    - [tidb](application/database/tidb/README.md)
    - [vitess](application/database/vitess/README.md)
- [streaming&messaging](application/streaming&messaging/README.md)
    - [flink](application/streaming&messaging/flink/README.md)
    - [kafka](application/streaming&messaging/kafka/README.md)
        - [k8s-1.8](application/streaming&messaging/kafka/k8s-1.8/README.md)
        - [kafka](application/streaming&messaging/kafka/kafka/README.md)
    - [nats](application/streaming&messaging/nats/README.md)
    - [openmessaging](application/streaming&messaging/openmessaging/README.md)
    - [rabbitmq](application/streaming&messaging/rabbitmq/README.md)
    - [spark](application/streaming&messaging/spark/README.md)
    - [storm](application/streaming&messaging/storm/README.md)
- [~bigdata]()
    - [hbase](application/~bigdata/hbase/README.md)
    - [hdfs](application/~bigdata/hdfs/README.md)
    - [presto](application/~bigdata/presto/README.md)
    - [spark](application/~bigdata/spark/README.md)
        - [spark-on-k8s-operator](application/~bigdata/spark/spark-on-k8s-operator/README.md)
        - [spark-on-kubernetes](application/~bigdata/spark/spark-on-kubernetes/README.md)
        - [spark-on-yarn](application/~bigdata/spark/spark-on-yarn/README.md)
        - [spark-standalone]()
            - [k8s-1.6](application/~bigdata/spark/spark-standalone/k8s-1.6/README.md)
            - [k8s-1.8](application/~bigdata/spark/spark-standalone/k8s-1.8/README.md)
                - [spark-2.3.0-ha](application/~bigdata/spark/spark-standalone/k8s-1.8/spark-2.3.0-ha/README.md)
                    - [method-one](application/~bigdata/spark/spark-standalone/k8s-1.8/spark-2.3.0-ha/method-one/README.md)
                    - [method-two](application/~bigdata/spark/spark-standalone/k8s-1.8/spark-2.3.0-ha/method-two/README.md)
                - [spark-2.3.0](application/~bigdata/spark/spark-standalone/k8s-1.8/spark-2.3.0/README.md)
            - [spark-on-cephfs](application/~bigdata/spark/spark-standalone/spark-on-cephfs/README.md)
            - [spark-on-glusterfs](application/~bigdata/spark/spark-standalone/spark-on-glusterfs/README.md)
        - [zeppelin](application/~bigdata/spark/zeppelin/README.md)
    - [yarn](application/~bigdata/yarn/README.md)
- [~blockchain]()
    - [ethereum](application/~blockchain/ethereum/README.md)
        - [nonproxy]()
        - [proxy]()
    - [mining.md](application/~blockchain/mining.md)
- [~crawlers](application/~crawlers/README.md)
    - [nutch](application/~crawlers/nutch/README.md)
    - [scrapy](application/~crawlers/scrapy/README.md)
- [~hpc](application/~hpc/README.md)
    - [Shifter](application/~hpc/shifter.md)
    - [Singularity](application/~hpc/singularity.md)
- [~ml&ai](application/~ml&ai/README.md)
    - [caffe](application/~ml&ai/caffe/README.md)
    - [caffe2](application/~ml&ai/caffe2/README.md)
    - [GPU](application/~ml&ai/gpu.md)
    - [kubeflow](application/~ml&ai/kubeflow/README.md)
        - [ciao](application/~ml&ai/kubeflow/ciao/README.md)
    - [Nvidia docker](application/~ml&ai/nvidia-docker.md)
    - [GPU 调度](application/~ml&ai/nvidia.md)
    - [sklearn](application/~ml&ai/sklearn/README.md)
    - [spark-ml](application/~ml&ai/spark-ml/README.md)
    - [tensorflow](application/~ml&ai/tensorflow/README.md)
        - [kubeflow](application/~ml&ai/tensorflow/kubeflow/README.md)
- [~repository](application/~repository/README.md)
    - [gitlab](application/~repository/gitlab/README.md)
        - [standalone](application/~repository/gitlab/standalone/README.md)
    - [nexus](application/~repository/nexus/README.md)
        - [Maven](application/~repository/nexus/maven.md)
        - [NPM](application/~repository/nexus/npm.md)
        - [NuGet](application/~repository/nexus/nuget.md)
        - [PyPi](application/~repository/nexus/pypi.md)
        - [Registry](application/~repository/nexus/registry.md)

## Awesome

- [awesome](awesome/README.md)

- [blog](awesome/blog/README.md)
    - [2015]()
    - [2016]()
    - [2017]()
    - [2018]()
    - [2019](awesome/blog/2019/README.md)
        - [01]()
            - [CNCF 博客指南](awesome/blog/2019/01/07.md)
            - [CNCF 博客指南](awesome/blog/2019/01/15.md)
            - [CNCF 博客指南](awesome/blog/2019/01/17.md)
        - [04]()
            - [CNCF 博客指南 · 2019.04.24](awesome/blog/2019/04/24.md)
    - [云原生博客来源](awesome/blog/source.md)

- [book](awesome/book/README.md)

- [cncf](awesome/cncf/README.md)
    - [certification](awesome/cncf/certification/README.md)
        - [cka](awesome/cncf/certification/cka/README.md)
        - [ckad](awesome/cncf/certification/ckad/README.md)
            - [find maximum cpu usage pod name in a namespace](awesome/cncf/certification/ckad/9.md)
        - [kcsp](awesome/cncf/certification/kcsp/README.md)
        - [training](awesome/cncf/certification/training/README.md)

- [community](awesome/community/README.md)
    - [kubecon-cloudnativecon](awesome/community/kubecon-cloudnativecon/README.md)
    - [kubernetes-day](awesome/community/kubernetes-day/README.md)
    - [mailing-lists](awesome/community/mailing-lists/README.md)
    - [meetup](awesome/community/meetup/README.md)
    - [slack](awesome/community/slack/README.md)

- [course](awesome/course/README.md)

- [ebook](awesome/ebook/README.md)

- [misc]()
    - [云原生博客](awesome/misc/blogs.md)
    - [新项目](awesome/misc/new-projects.md)
    - [public-cloud](awesome/misc/public-cloud/README.md)

    - [special]()
        - [KCSP](awesome/misc/special/KCSP/README.md)

        - [KTP](awesome/misc/special/KTP/README.md)

- [news](awesome/news/README.md)

- [ppt](awesome/ppt/README.md)

- [project](awesome/project/README.md)

    - [CNCF K8s 一致性工作组](awesome/project/conformance-working-group.md)
    - [Landscape](awesome/project/landscape.md)
    - [CNCF SIG](awesome/project/sig.md)
    - [CNCF 技术监督委员会（Toc）](awesome/project/toc.md)
    - [CNCF 工作组](awesome/project/wg.md)
- [tutorial](awesome/tutorial/README.md)

- [workshop](awesome/workshop/README.md)

- [gitbook-template](gitbook-template/README.md)

- [如何贡献](gitbook-template/CONTRIBUTING.md)

## Management

- [management](management/README.md)

- [!tls]()
    - [cert-manager](management/!tls/cert-manager/README.md)
    - [kube-lego](management/!tls/kube-lego/README.md)
    - [Let's Encrypt](management/!tls/letsencrypt.md)
- [api-gateway](management/api-gateway/README.md)
    - [ambassador](management/api-gateway/ambassador/README.md)
    - [kong](management/api-gateway/kong/README.md)
        - [manifests]()
    - [sentinel](management/api-gateway/sentinel/README.md)
    - [tyk](management/api-gateway/tyk/README.md)
- [RPC](management/rpc/README.md)
    - [avro](management/rpc/avro/README.md)
    - [dubbo](management/rpc/dubbo/README.md)
    - [grpc](management/rpc/grpc/README.md)
    - [thrift](management/rpc/thrift/README.md)
- [服务发现](management/service-discovery/README.md)
    - [!bind](management/service-discovery/!bind/README.md)
    - [!dnsmasq](management/service-discovery/!dnsmasq/README.md)
    - [!external-dns](management/service-discovery/!external-dns/README.md)
    - [!haproxy](management/service-discovery/!haproxy/README.md)
    - [!kube-dns](management/service-discovery/!kube-dns/README.md)
        - [kube-dns](management/service-discovery/!kube-dns/kube-dns.md)
    - [!powerdns](management/service-discovery/!powerdns/README.md)
    - [consul](management/service-discovery/consul/README.md)
    - [contour](management/service-discovery/contour/README.md)
    - [core-dns]()
    - [DNS](management/service-discovery/dns.md)
    - [etcd](management/service-discovery/etcd/README.md)
    - [eureka](management/service-discovery/eureka/README.md)
    - [nacos](management/service-discovery/nacos/README.md)
    - [nginx](management/service-discovery/nginx/README.md)
        - [Annotations](management/service-discovery/nginx/annotations.md)
    - [traefik](management/service-discovery/traefik/README.md)
    - [zookeeper](management/service-discovery/zookeeper/README.md)
        - [k8s-1.8](management/service-discovery/zookeeper/k8s-1.8/README.md)
        - [zookeeper](management/service-discovery/zookeeper/zookeeper/README.md)

- [service-mesh](management/service-mesh/README.md)
    - [conduit](management/service-mesh/conduit/README.md)
    - [istio]()
    - [linkerd](management/service-mesh/linkerd/README.md)
    - [zuul](management/service-mesh/zuul/README.md)
- [service-proxy](management/service-proxy/README.md)
    - [contour](management/service-proxy/contour/README.md)
    - [envoy](management/service-proxy/envoy/README.md)
    - [gimbal](management/service-proxy/gimbal/README.md)
    - [haproxy](management/service-proxy/haproxy/README.md)
    - [nginx](management/service-proxy/nginx/README.md)
    - [openrestry](management/service-proxy/openrestry/README.md)
    - [trafik](management/service-proxy/trafik/README.md)

## 微服务

- [microservices](microservices/README.md)

- [Backends For Frontends](microservices/BFF.md)
- [java](microservices/java/README.md)

- [中间件](microservices/middleware.md)
- [spring](microservices/spring/README.md)

## 可观测性

- [observability](observability/README.md)

- [chaos-engineering](observability/chaos-engineering/README.md)

    - [chaoskube](observability/chaos-engineering/chaoskube/README.md)

    - [chaostoolkit](observability/chaos-engineering/chaostoolkit/README.md)

    - [litmus](observability/chaos-engineering/litmus/README.md)

    - [powerful-seal](observability/chaos-engineering/powerful-seal/README.md)

- [logging](observability/logging/README.md)

    - [elastic](observability/logging/elastic/README.md)

    - [fluentd](observability/logging/fluentd/README.md)

    - [grafana-loki](observability/logging/grafana-loki/README.md)

    - [graylog](observability/logging/graylog/README.md)

    - [logstash](observability/logging/logstash/README.md)

    - [~logging](observability/logging/~logging/README.md)

        - [审计](observability/logging/~logging/audit.md)
        - [efk](observability/logging/~logging/efk/README.md)

            - [1.8](observability/logging/~logging/efk/1.8/README.md)

        - [elk](observability/logging/~logging/elk/README.md)

        - [logspout](observability/logging/~logging/logspout/README.md)

- [monitoring](observability/monitoring/README.md)

    - [grafana](observability/monitoring/grafana/README.md)

        - [模板Fluentd](observability/monitoring/grafana/dashboard.md)
        - [me]()
    - [graphite](observability/monitoring/graphite/README.md)

    - [influxdata]()
        - [influxdb](observability/monitoring/influxdata/influxdb/README.md)

    - [netdata](observability/monitoring/netdata/README.md)

    - [openmetrics](observability/monitoring/openmetrics/README.md)

    - [opentsdb](observability/monitoring/opentsdb/README.md)

    - [prometheus](observability/monitoring/prometheus/README.md)

        - [alertmanager](observability/monitoring/prometheus/alertmanager/README.md)

        - [config](observability/monitoring/prometheus/config/README.md)

        - [exporters]()
            - [Ceph exporter](observability/monitoring/prometheus/exporters/ceph-exporter.md)
            - [Node exporter](observability/monitoring/prometheus/exporters/node-exporter.md)
        - [operator](observability/monitoring/prometheus/operator/README.md)

    - [zabbix](observability/monitoring/zabbix/README.md)

    - [~heapster](observability/monitoring/~heapster/README.md)

    - [~k8s-netchecker-agent](observability/monitoring/~k8s-netchecker-agent/README.md)

    - [~kube-state-metrics](observability/monitoring/~kube-state-metrics/README.md)

    - [~kubernetes-dashboard](observability/monitoring/~kubernetes-dashboard/README.md)

    - [~metrics-server](observability/monitoring/~metrics-server/README.md)

    - [~node-problem-detector](observability/monitoring/~node-problem-detector/README.md)

- [tracing](observability/tracing/README.md)

    - [jaeger](observability/tracing/jaeger/README.md)

    - [opentracing](observability/tracing/opentracing/README.md)

    - [skywalking](observability/tracing/skywalking/README.md)

    - [zipkin](observability/tracing/zipkin/README.md)

- [orchestration](orchestration/README.md)

- [amazon-ecs](orchestration/amazon-ecs/README.md)

- [azure-service-fabric](orchestration/azure-service-fabric/README.md)

- [kubernetes]()
- [mesos](orchestration/mesos/README.md)

    - [Mesos API](orchestration/mesos/api.md)
    - [编译 Mesos](orchestration/mesos/compile.md)
    - [marathon](orchestration/mesos/marathon/README.md)

    - [mesosphere](orchestration/mesos/mesosphere/README.md)

        - [搭建 Mesosphere 集群（测试环境）](orchestration/mesos/mesosphere/setup.md)
- [nomad](orchestration/nomad/README.md)

- [swarmkit](orchestration/swarmkit/README.md)

- [platform](platform/README.md)

- [hosted-platform](platform/hosted-platform/README.md)

    - [aks](platform/hosted-platform/aks/README.md)

    - [digitalocean-kubernetes](platform/hosted-platform/digitalocean-kubernetes/README.md)

    - [eks](platform/hosted-platform/eks/README.md)

    - [gke](platform/hosted-platform/gke/README.md)

    - [tke](platform/hosted-platform/tke/README.md)

- [kubernetes-distribution](platform/kubernetes-distribution/README.md)

    - [k3s](platform/kubernetes-distribution/k3s/README.md)

    - [openshift](platform/kubernetes-distribution/openshift/README.md)

        - [administration](platform/kubernetes-distribution/openshift/administration/README.md)

        - [concepts]()
            - [BuildConfig（bc）](platform/kubernetes-distribution/openshift/concepts/buildconfig.md)
            - [Namespace（ns）](platform/kubernetes-distribution/openshift/concepts/namespace.md)
            - [Project](platform/kubernetes-distribution/openshift/concepts/project.md)
            - [Route](platform/kubernetes-distribution/openshift/concepts/route.md)
        - [debug](platform/kubernetes-distribution/openshift/debug/README.md)

            - [Error pulling Docker image](platform/kubernetes-distribution/openshift/debug/error-pulling-docker-image.md)
        - [development](platform/kubernetes-distribution/openshift/development/README.md)

        - [devops](platform/kubernetes-distribution/openshift/devops/README.md)

        - [monitoring](platform/kubernetes-distribution/openshift/monitoring/README.md)

        - [networking](platform/kubernetes-distribution/openshift/networking/README.md)

        - [setup](platform/kubernetes-distribution/openshift/setup/README.md)

            - [manual](platform/kubernetes-distribution/openshift/setup/manual/README.md)

            - [minishift](platform/kubernetes-distribution/openshift/setup/minishift/README.md)

                - [安装 Minishift](platform/kubernetes-distribution/openshift/setup/minishift/preparing-to-install.md)
    - [rancher](platform/kubernetes-distribution/rancher/README.md)

    - [~okd](platform/kubernetes-distribution/~okd/README.md)

    - [~tectonic](platform/kubernetes-distribution/~tectonic/README.md)

- [kubernetes-installer](platform/kubernetes-installer/README.md)

    - [kind](platform/kubernetes-installer/kind/README.md)

    - [kops](platform/kubernetes-installer/kops/README.md)

    - [kubeadm](platform/kubernetes-installer/kubeadm/README.md)

        - [1.9]()
            - [Kubernetes 1.9](platform/kubernetes-installer/kubeadm/1.9/REAEME.md)
        - [Kubeadm 镜像](platform/kubernetes-installer/kubeadm/kubeadm-images.md)
        - [Kubeadm 部署 Kubernetes 集群](platform/kubernetes-installer/kubeadm/kubeadm.md)
    - [kubespray](platform/kubernetes-installer/kubespray/README.md)

    - [microk8s](platform/kubernetes-installer/microk8s/README.md)

    - [minikube](platform/kubernetes-installer/minikube/README.md)

        - [Minikube（MacOS）](platform/kubernetes-installer/minikube/minikube-macos.md)
        - [Minikube（Ubuntu Desktop）](platform/kubernetes-installer/minikube/minikube-ubuntu.md)
        - [Minikube（Windows）](platform/kubernetes-installer/minikube/minikube-windows.md)
        - [Minikube](platform/kubernetes-installer/minikube/minikube.md)
    - [~kubeasz](platform/kubernetes-installer/~kubeasz/README.md)

    - [~minishift](platform/kubernetes-installer/~minishift/README.md)

- [paas](platform/paas/README.md)

    - [flynn](platform/paas/flynn/README.md)

    - [portainer](platform/paas/portainer/README.md)

## Provisioning

- [provisioning](provisioning/README.md)

- [automation&configuration](provisioning/automation&configuration/README.md)

    - [ansible](provisioning/automation&configuration/ansible/README.md)

- [container-registry](provisioning/container-registry/README.md)

    - [docker-registry](provisioning/container-registry/docker-registry/README.md)

    - [harbor](provisioning/container-registry/harbor/README.md)

        - [_ha](provisioning/container-registry/harbor/_ha/README.md)

        - [_standalone](provisioning/container-registry/harbor/_standalone/README.md)

            - [CoreOS Clair](provisioning/container-registry/harbor/_standalone/clair.md)
            - [部署 Harbor](provisioning/container-registry/harbor/_standalone/deployment.md)
        - [adminserver]()
        - [jobservice]()
        - [mysql]()
        - [nginx]()
        - [pvc]()
        - [registry]()
        - [templates]()
        - [ui]()
    - [portus](provisioning/container-registry/portus/README.md)

    - [quay](provisioning/container-registry/quay/README.md)

- [key-management](provisioning/key-management/README.md)

    - [!openunison](provisioning/key-management/!openunison/README.md)

    - [!uaa](provisioning/key-management/!uaa/README.md)

    - [keycloak](provisioning/key-management/keycloak/README.md)

    - [knox](provisioning/key-management/knox/README.md)

    - [teleport](provisioning/key-management/teleport/README.md)

    - [vault](provisioning/key-management/vault/README.md)

- [security&compliance](provisioning/security&compliance/README.md)

    - [clair](provisioning/security&compliance/clair/README.md)

    - [kube-bench](provisioning/security&compliance/kube-bench/README.md)

    - [notary](provisioning/security&compliance/notary/README.md)

    - [sonatype-nexus](provisioning/security&compliance/sonatype-nexus/README.md)

    - [tuf](provisioning/security&compliance/tuf/README.md)

- [runtime](runtime/README.md)

- [cloud-native-network](runtime/cloud-native-network/README.md)

    - [!kube-router](runtime/cloud-native-network/!kube-router/README.md)

    - [calico]()
        - [calico-rbac.yaml.md](runtime/cloud-native-network/calico/calico-rbac.yaml.md)
        - [部署 Calico 网络](runtime/cloud-native-network/calico/calico.md)
    - [cilium](runtime/cloud-native-network/cilium/README.md)

    - [cni](runtime/cloud-native-network/cni/README.md)

    - [flannel](runtime/cloud-native-network/flannel/README.md)

    - [openvswitch](runtime/cloud-native-network/openvswitch/README.md)

    - [weave-net](runtime/cloud-native-network/weave-net/README.md)

- [cloud-native-storage](runtime/cloud-native-storage/README.md)

    - [ceph](runtime/cloud-native-storage/ceph/README.md)

    - [csi](runtime/cloud-native-storage/csi/README.md)

    - [gluster](runtime/cloud-native-storage/gluster/README.md)

    - [minio](runtime/cloud-native-storage/minio/README.md)

    - [openebs](runtime/cloud-native-storage/openebs/README.md)

    - [rook](runtime/cloud-native-storage/rook/README.md)

    - [swift](runtime/cloud-native-storage/swift/README.md)

- [container-runtime](runtime/container-runtime/README.md)

    - [!kubevirt](runtime/container-runtime/!kubevirt/README.md)

    - [-](runtime/container-runtime/-/README.md)

        - [镜像](runtime/container-runtime/-/image.md)
        - [oci](runtime/container-runtime/-/oci/README.md)

    - [containerd](runtime/container-runtime/containerd/README.md)

    - [cri-o](runtime/container-runtime/cri-o/README.md)

    - [docker]()
    - [firecracker](runtime/container-runtime/firecracker/README.md)

    - [g-visor](runtime/container-runtime/g-visor/README.md)

    - [kata](runtime/container-runtime/kata/README.md)

    - [lxd](runtime/container-runtime/lxd/README.md)

        - [linuxcontainers](runtime/container-runtime/lxd/linuxcontainers/README.md)

            - [lxc](runtime/container-runtime/lxd/linuxcontainers/lxc/README.md)

            - [lxcfs](runtime/container-runtime/lxd/linuxcontainers/lxcfs/README.md)

            - [lxd](runtime/container-runtime/lxd/linuxcontainers/lxd/README.md)

    - [rkt](runtime/container-runtime/rkt/README.md)

    - [runc](runtime/container-runtime/runc/README.md)

## Serverless

- [serverless](serverless/README.md)

- [framework](serverless/framework/README.md)

    - [apex](serverless/framework/apex/README.md)

    - [chalice](serverless/framework/chalice/README.md)

    - [sam](serverless/framework/sam/README.md)

    - [serverless](serverless/framework/serverless/README.md)

    - [zappa](serverless/framework/zappa/README.md)

- [platform]()
    - [hosted-platform](serverless/platform/hosted-platform/README.md)

        - [alibaba-cloud-function-compute](serverless/platform/hosted-platform/alibaba-cloud-function-compute/README.md)

        - [aws-lambda](serverless/platform/hosted-platform/aws-lambda/README.md)

        - [azure-functions](serverless/platform/hosted-platform/azure-functions/README.md)

        - [google-cloud-functions](serverless/platform/hosted-platform/google-cloud-functions/README.md)

        - [huawei-functionstage](serverless/platform/hosted-platform/huawei-functionstage/README.md)

        - [ibm-cloud-functions](serverless/platform/hosted-platform/ibm-cloud-functions/README.md)

        - [tencent-cloud](serverless/platform/hosted-platform/tencent-cloud/README.md)

    - [installable-platform](serverless/platform/installable-platform/README.md)

        - [dispatch](serverless/platform/installable-platform/dispatch/README.md)

        - [fission](serverless/platform/installable-platform/fission/README.md)

        - [knative](serverless/platform/installable-platform/knative/README.md)

            - [blogs]()
                - [博客源](serverless/platform/installable-platform/knative/blogs/source.md)
        - [kubeless](serverless/platform/installable-platform/kubeless/README.md)

        - [open-faas](serverless/platform/installable-platform/open-faas/README.md)

            - [部署 OpenFaaS](serverless/platform/installable-platform/open-faas/deployment.md)
        - [open-whisk](serverless/platform/installable-platform/open-whisk/README.md)

        - [pipeline-ai](serverless/platform/installable-platform/pipeline-ai/README.md)

        - [riff](serverless/platform/installable-platform/riff/README.md)

        - [virtual-kubelet](serverless/platform/installable-platform/virtual-kubelet/README.md)

- [security](serverless/security/README.md)

- [tools]()
    - [event-gateway](serverless/tools/event-gateway/README.md)

    - [huaura](serverless/tools/huaura/README.md)

    - [lambda]()
        - [node-lambda](serverless/tools/lambda/node-lambda/README.md)

        - [python-lambda](serverless/tools/lambda/python-lambda/README.md)
