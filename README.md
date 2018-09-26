# GFW Fires API

[![Build Status](https://travis-ci.org/resource-watch/converter.svg?branch=develop)](https://travis-ci.org/resource-watch/converter)
[![Test Coverage](https://api.codeclimate.com/v1/badges/b67e263c0e624c8bb50f/test_coverage)](https://codeclimate.com/github/resource-watch/converter/test_coverage)

This repository contains the microservice that converts RW API queries between different formats

## First time user
Perform the following steps:
* [Install docker](https://docs.docker.com/engine/installation/)
* Clone this repository
* Enter in the directory
* After, you open a terminal (if you have mac or windows, open a terminal with the 'Docker Quickstart Terminal') and execute the next command:

```bash
    docker-compose -f docker-compose-develop.yml build

```

## Run in develop mode (Watch mode)
Remember: In windows and Mac, open the terminal with 'Docker Quickstart Terminal'

```bash
docker-compose -f docker-compose-develop.yml build
//this command up the machine. If you want up in background mode, you add the -d option
```


## Execute test
Remember: In windows and Mac, open the terminal with 'Docker Quickstart Terminal'
```
docker-compose -f docker-compose-test.yml run test
```
