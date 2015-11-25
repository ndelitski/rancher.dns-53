# rancher.dns-53

Service-discovery agent for exposing all services into Route 53 dns and auto-registering to LB.

## Differences with official `external-dns` package
 - Services are picked if special label is presented(not only port)
 - Automatic registering services in LB mapped to each route 53 entry and binded to 80 port.


