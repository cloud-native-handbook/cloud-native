FROM python:3.5
MAINTAINER JinsYin <github.com/jinsyin>

USER root

COPY socket2kafka.py /

RUN pip3 install kafka
RUN chmod +x /socket2kafka.py