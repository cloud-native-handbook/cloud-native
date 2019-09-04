# http://docs.ceph.com/docs/master/install/get-packages/
# https://github.com/CentOS/CentOS-Dockerfiles/tree/master/kubernetes/controller-manager
FROM centos:7.3.1611
MAINTAINER JinsYin <jinsyin@gmail.com>

ARG CEPH_RELEASE="jewel"
ARG CEPH_VERSION="10.2.9"
ARG KUBE_VERSION="v1.8.2"
ARG KUBE_COMPONENT="https://storage.googleapis.com/kubernetes-release/release/${KUBE_VERSION}/bin/linux/amd64/kube-controller-manager"

RUN yum install -y wget \
  && wget ${KUBE_COMPONENT} -O /usr/local/bin/kube-controller-manager \
  && chmod +x /usr/local/bin/kube-controller-manager

# Install dependencies
RUN yum install -y yum-utils \
  && yum-config-manager --add-repo https://dl.fedoraproject.org/pub/epel/7/x86_64/ \
  && yum install --nogpgcheck -y epel-release \
  && rpm --import /etc/pki/rpm-gpg/RPM-GPG-KEY-EPEL-7 \
  && rm -f /etc/yum.repos.d/dl.fedoraproject.org*

# Install ceph-release and ceph-common
RUN  rpm --import 'https://download.ceph.com/keys/release.asc' \
  && rpm -Uvh http://download.ceph.com/rpm-${CEPH_RELEASE}/el7/noarch/ceph-release-1-1.el7.noarch.rpm \
  && yum install -y ceph-common-${CEPH_VERSION} libradosstriper1-${CEPH_VERSION} librgw2-${CEPH_VERSION}