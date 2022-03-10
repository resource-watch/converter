## 10/03/2022

- Upgrade node 12 -> 16.

## 31/05/2021

- Update `rw-api-microservice-node` to add CORS support.

## 04/12/2020

- Replace CT integration library

# v1.0.0

## 09/04/2020

- Add node affinity to kubernetes configuration.

## 03/03/2020

- Add `excludeGeometries` optional param to `sql2FS` endpoint, to support opting out of loading geometries.
- Add tests to `sql2FS` for both POST and GET requests.

## 14/11/2019

- Set CPU and memory quotas on k8s config
- Added liveliness and readiness probes to k8s config
- Update jsonapi-serializer which may lead to changes in response signature: https://github.com/SeyZ/jsonapi-serializer/issues/93
- Replace generators with async/await
- CS formatting to match ESLint rules
- Update ESLint packages and config
- Added hook to validate ESLint on commit 
- Update node version to 12.x
- Replace npm with yarn

# Prev

- Add support for `SELECT DISTINCT columnName` query types in FS query generator
