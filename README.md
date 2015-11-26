# rancher.dns-53

L7 LB and External DNS in one service. Register rancher services in Route53 and balance services by cname's using Haproxy on 80 port.

## Differences with official `external-dns` package
 - Services are picked if special label is presented `io.rancher.route53: 'true'` and `ports: - your_port`
 - All Route53 records point to host_ip:80
 - Haproxy is binded to 80 port with routing based on service cname's. Service port is picked from `ports` section.


