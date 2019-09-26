# Kubernetes 用户身份管理、SSO

https://github.com/kubernetes/dashboard/issues/1441

https://projects.invisionapp.com/share/AF9E3F55W#/screens/206606225_RBAC__List_Of_Roles

## OAuth2 Identity Provider（身份提供者）

也叫 auth provider（认证提供者）。

Kubernetes 不提供 OpenID Connect Identity Provider。

Kubernetes 没有 “web interface” 来触发认证过程，没有任何浏览器或接口来收集凭据，这就是为什么需要首先向身份提供者进行认证的原因。

* [CoreOS dex](https://github.com/coreos/dex)
* [Keycloak](https://github.com/keycloak/keycloak)
* [CloudFoundry UAA](https://github.com/cloudfoundry/uaa)
* [OpenUnison](https://github.com/tremolosecurity/openunison)

## Keycloak

> https://github.com/jboss-dockerfiles/keycloak/pull/92
> https://robertbrem.github.io/Microservices_with_Kubernetes/16_SSO_with_Keycloak/01_Setup_Keycloak/
> http://www.devoperandi.com/kubernetes-authentication-openid-connect/

Kubernetes Swagger UI

```bash
$ docker run -itd --name mysql --net=host -e MYSQL_DATABASE=keycloak -e MYSQL_USER=keycloak -e MYSQL_PASSWORD=keycloak -e MYSQL_ROOT_PASSWORD=123456 -d mysql:5.6

$ docker run -itd --name keycloak --net=host -e MYSQL_DATABASE=keycloak -e MYSQL_USER=keycloak -e MYSQL_PASSWORD=keycloak -e MYSQL_PORT_3306_TCP_ADDR=127.0.0.1 -e MYSQL_PORT_3306_TCP_PORT=3306 -e KEYCLOAK_USER=admin -e KEYCLOAK_PASSWORD=test -e JGROUPS_STACK=tcp jboss/keycloak -b=0.0.0.0 -bmanagement=0.0.0.0

$ curl http://localhost:8080
$ curl https://localhost:8443
```

## 参考

* [LDAP 快速入门](https://www.cnblogs.com/obpm/archive/2010/08/28/1811065.html)
* [windows server 系统用户与用户组管理](http://blog.csdn.net/dawangdiguo/article/details/14004367)
* [Standard Claims](https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims)
* [Kubernetes authentication through dex](https://github.com/coreos/dex/blob/master/Documentation/kubernetes.md)
* [Setup Keycloak](https://robertbrem.github.io/Microservices_with_Kubernetes/16_SSO_with_Keycloak/01_Setup_Keycloak/)
* [网易云容器服务基于 Kubernetes 的实践探索](http://blog.csdn.net/xiaobing_122613/article/details/78315260)
* [Kubernetes Access Control with dex](https://speakerdeck.com/ericchiang/kubernetes-access-control-with-dex)
* [Kubernetes Auth and Access Control](https://speakerdeck.com/ericchiang/kubecon-2016-kubernetes-auth-and-access-control)
* [Kubernetes Identity Management](https://www.tremolosecurity.com/kubernetes-idm-part-i/)
* [jwt.io](https://jwt.io/)
* [Ansible + Kubernetes + Keycloak = Easy](https://www.linkedin.com/pulse/ansible-kubernetes-keycloak-easy-glenn-west?articleId=9149479723559892827)
