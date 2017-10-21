# ![Software Plumbers](http://docs.softwareplumbers.com/common/img/SquareIdent-160.png) Abstract Query

Abstract query, providing for client-side optimisation of queries.

## Example

```javascript

let query = Query
	.from({ 
		course: 'javascript 101', 
		student: { age : [21,] }, 
		grade: [,'C']
	}).or({ 
		course: 'medieval French poetry', 
		student: { age: [40,65]}, 
		grade: [,'C']
	})

let expr = query.toExpression();
```

and expression should equal:

`grade<"C" and (course="javascript 101" and student.age>=21 or course="medieval French poetry" and student.age>=40 and student.age<65)`

Note that the common expression `grade<"C"` has been factored out of the 'or'. Plainly that's not all that much use in this simple example but when programatically constructing complex queries it is extremely useful to ensure that the query that ultimately sent to the data store is reasonably concise.

## Expression Formatters

The `toExpression` method takes a formatter object so that query objects can be used to create any kind of output. For example:

```javascript
const formatter = {
	andExpr(...ands) { return ands.join(' && ') }, 
	orExpr(...ors) { return "(" + ors.join(' || ') + ")"},
	operExpr(dimension, operator, value, context) { 
		return (operator === 'contains')
			? dimension"[" + value + "]"
			: dimension + operator +value 
	}

let expr = query.toExpression(formatter)
```

Will result in an expr like: 

`grade<"C" && (course="javascript 101" && student[age>="21"] || course="medieval French poetry" && student[age>="40" && age<"65"])`

The objective is to provide several different expression formatters, to support (at a minumum) constructing suitable expressions for IndexedDB, MongoDB, and MySQL. These formatters will be provided in separate packages so that a code can be written to the abstract-query API without creating a dependency on any given back-end store. The following are currently available:

| Target Language | Package |
|-----------------|---------|
| MongoDB         | [mongo-query-format](https://npmjs.org/packages/mongo-query-format) |

## Filtering Arrays and Iterables

Abstract Query itself provides a simple 'predicate' property that can be used to filter arrays. For example:

```javascript
let data = [ 
    { name: 'jonathan', age: 12}, 
    { name: 'cindy', age: 18}, 
    { name: 'ada', age: 21} 
];

let query = Query.from({ age: [,18]});
let result = data.filter(query.predicate);
```

Will filter all the items with age less than 18 from the given data array. While the query API offers little advantage over an anonymous predicate function in this simple example, the ability to compose, optimise, and parametrize queries is a significant benefit in more complex cases. As more expression formatters are built, the ability to use a single query format across native data structures, front-end data stores, and back-end data stores will provide significant benefits to code readability and portability.

## Parameters

Of course, abstract query also supports parametrized queries.

```javascript
let query = Query
    .from({ course: 'javascript 101', student: { age : [$.min_age,] }, grade: [,'C']})
    .or({ course: 'medieval French poetry', student: { age: [$.min_age, 65]}, grade: [,'C']})

let expr = query.toExpression();
```

Will result in an expr like:

`grade<"C" and (course="javascript 101" and student.age>=$min_age or course="medieval French poetry" and student.age>=$min_age and student.age<65)`

Parameters can be bound to create a new query, thus given the query above:

```javascript
let expr2 = query
	.bind({min_age: 27})
	.toExpression();
```

Will result in an expr like:

`grade<"C" and (course="javascript 101" and student.age>=27 or course="medieval French poetry" and student.age>=27 and student.age<65)`

The library re-optimises the query when parameters are bound, and also tries quite hard to indentify redundant or mutually exclusive criteria even if a query is parametrised.

## Subqueries and Child Objects

Subqueries can be used to put conditions on sub-properties. In the below example, the subquery 'expertise_query' is used to pick items in the data array which have an object in 'expertise' which has a language property of 'java'. 

```javascript
let data = [ 
    { 	name: 'jonathan',
    	age: 45 
    	expertise: [ 
    		{ language:'java', level:'expert' }, 
    		{ language:'javascript', level:'novice' }
    	] 
    }, ...other entries...
];

let expertise_query = Query.from({ language: 'java' });

let result = data.filter(Query
	.from({ age: [,50], expertise: { $has : expertise_query })
	.predicate
);
```

Note that it is not necessary to create a subquery as a separate object, the final query could have been written `Query.from({ age: [,50], expertise: { $has: { language:'java' } } })` with identical effect. Subquery syntax can also be used to filter on properties that are not arrays:

```javascript
let data = [ 
    { 	name: 'jonathan',
    	age: 45 
    	expertise: { language:'java', level:'expert' }
    }, ...other entries...
];

let result = data.filter(Query
	.from({ age: [,50], expertise: { language: 'java' })
	.predicate
);
```

## Caching

Abstract query will also aid in building any kind of caching layer. Because abstract-query actually stores the query in an internal canoncial form, two queries can be compared for equality even if they are outwardly somewhat different. Thus:

```javascript
let query1 = Query.from({x: [,2], y: { alpha: [2,6], beta: { nuts: 'brazil' }}});
let query2 = Query.from({y: { beta: { nuts: 'brazil' }, alpha: [2,6]}, x: [,2]});
let query3 = query1.and(query2);
let query4 = query2.and(query1);

query1.equals(query2) // true
query3.equals(query4) // true
```

Even better, query.contains allows you to detect whether one query is a subset of another; thus data can be potentially be retrieved by just filtering an existing cached result set rather than requerying the data store for data we already have.

For the latest API documentation see [The Software Plumbers Site](http://docs.softwareplumbers.com/abstract-query/master)

## Project Status

Beta. The API is stabilising, and although unit test coverage could be better it seems broadly functional. We are building downstream code (the above-mentioned formatters, for example).

