<p align="center">
    <img src="https://raw.githubusercontent.com/superReal/octopus/master/octopus.png" width="128" height="128" alt="Octopus">
    <br>
    <b>Octopus</b>
    <br>
    Quickly crawl a whole website for broken links
</p>


### Install

```bash
npm install --global @superreal/octopus
```

*or*

```bash
yarn global add @superreal/octopus
```


### Usage

```bash
octopus <domain> [options]
```


### Options

Option | Shortcut | Description | Default
------ | -------- | ----------- | -------
`--ignore-query` | `-q` | Ignore a query string | `false`
`--ignore-external` | `-e` | Ignore all external links | `false`
`--timeout` | `-t` | Time to wait for response | `5000`
`--help` | `-h` | Outputs help text |  


### Examples

```bash
octopus www.superreal.de
octopus www.awg-mode --ignore-external
octopus www.hardeck.de --ignore-query=isEnergyEfficiencyChartOpen --ignore-query=followSearch
```


### Icon
Made by [Freepik](https://www.freepik.com) from [www.flaticon.com](https://www.flaticon.com)
