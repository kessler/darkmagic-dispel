# darkmagic-dispel

turn [darkmagic](https://github.com/kessler/darkmagic) code into normal code. 
this module does not overwrite your code but rather creates a new copy of the transformed result in a separate directory

## install
```
    npm install -g darkmagic-dispel
```

## usage
```
darkmagic-dispel --path=/absolute/path/to/lib/with/darkmagic/code
```
check the results at /absolute/path/to/lib/with/darkmagic/dispel

--filter can be used to replace gulp's default *.js glob expression
