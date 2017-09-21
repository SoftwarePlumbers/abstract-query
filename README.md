# ![Software Plumbers](http://docs.softwareplumbers.com/common/img/SquareIdent-160.png) Abstract Query

Abstract query, providing for client-side optimisation of queries.

## Example

```javascript
let query = Query
    .fromConstraint({x: Range.lessThan(2), y: 4})
    .and({ z: 5})
    .or({x:6, y:3, z: Range.greaterThan(99)})

let expression = query.toExpression( 
    (...ands) => '(' + ands.join(') and (') + ')', 
    (...ors) => ors.join(' or '),
    (dimension, operator, value) => dimension + operator + value
);
```

and expression should equal '(x<2) and (y=4) and (z=5) or (x=6) and (y=3) and (z>99)'. This is unimpressive until it is explained that the library will also do things like supressing redundant criteria and factoring out common expressions prior to generating an expression.

For the latest API documentation see [The Software Plumbers Site](http://docs.softwareplumbers.com/abstract-query/master)

## Project Status

Alpha. It seems functional, and the unit tests pass, but there is quite a bit of work to do before it becomes really useful.  

