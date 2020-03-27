const app = require('express');
const mysql = require('mysql');

const conn = mysql.createPool({
    connectionLimit: 20,
    host: 'localHost',
    port: '3306',
    user: 'root',
    password:'toor',
    database:'prueba_rrhh',
    insecureAuth:true,
    multipleStatements:true
})

const router = app.Router();

function getChildren(parent, list, departments){
    var children = []
    var retChildren = {}

    if(parent['idEntity'] in departments){
        return departments[parent['idEntity']]
    }

    for(var i = 0; i < list.length; i++){
        if(parent['idEntity'] === list[i]['idEntity'] && parent['idEntity'] !== list[i]['Child']){
            children.push(list[i]['Child']);
        }
    }

    for(var i = 0; i < list.length; i++){
        if(children.includes(list[i]['idEntity'])){
            retChildren[list[i]['idEntity']] = (getChildren(list[i], list, departments));
        }
    }

    return {'idEntity':parent['idEntity'], 'name':parent['name'],'children':retChildren};
}

//Obtener el arbol de la base de datos
router.get('/get-tree', (req, res, next)=>{
    let query = "select * from entity as ent "
            + "left join entity_groups as entg on ent.idEntity=entg.parent "
            + "left join entity_department as edep on ent.idEntity=edep.id_entity "
            + "left join employee_department as empdep on empdep.id_department_e=edep.id_department "
            + "left join department as dep on dep.idDepartment = empdep.id_department_e "
            + "left join institution_entity as einst on einst.id_entity = ent.idEntity "
            + "left join institution as inst on inst.idInstitution = einst.id_institution;";

    conn.query(query, (error, results)=> {
        if(error){
            next(error)
        }else{
            var employees = [];
            var nonEmployees = [];
            var root;
            results.forEach(element => {
                if(element['id_employee']){
                    employees.push(element);
                }else{
                    nonEmployees.push(element);
                }
                if(element['Parent'] === element['Child'] && element['Parent'])
                    root = element;
            });

            var departments = {}
            for(var i = 0; i < employees.length; i++)
                departments[employees[i]['idEntity']] = {
                    'id_department':employees[i]['id_department'],
                    'name': employees[i]['name'],
                    'employees':[]
                };

            for(var i = 0; i < employees.length; i++){
                departments[employees[i]['idEntity']]['employees'].push(employees[i]['id_employee']);
            }

            var tree = getChildren(root, results, departments);

            root = {'id_institution':root['id_institution'],'name':root['name'], 'children':tree}

            res.status(200).json({response:root});
        }
    })
});

//CRUD empleado a departamentos
router.post('/insert_employees_department', (req, res, next)=>{
    let {id_employee} = req.body;
    let query = 'SELECT * FROM employee_department WHERE id_employee=?';

    
    conn.query(query, [id_employee], (error, results)=> {
        if(error){
            next(error)
        }else{
            if(results.length){
                res.status(400).json({response:'Ese empleado ya esta en un departamento'});
            }
        }
    });

    query = 'INSERT INTO employee (idEmployee) values (?);'

    conn.query(query, [id_employee], (error, results)=> {
        if(error){
            next(error)
        }else{
            next();
        }
    });
    
}, (req, res, next)=>{
    let {id_department_e, id_employee} = req.body;
    let query = 'INSERT INTO employee_department (id_department_e, id_employee) values (?, ?);';

    conn.query(query, [id_department_e, id_employee], (error, results)=> {
        if(error){
            next(error)
        }else{
            res.status(200).json({response:true});
        }
    });
});

router.put('/update-employee-department', (req, res, next)=>{
    let {id_department_e, id_employee} = req.body;
    let query = 'UPDATE employee_department SET id_department_e=? WHERE (id_employee=?)';

    conn.query(query, [id_department_e, id_employee], (error, results)=> {
        if(error){
            next(error)
        }else{
            res.status(200).json({response:true});
        }
    })
});

router.put('/delete-employee-department', (req, res, next)=>{
    let {id_employee} = req.body;
    let query = 'delete from employee_department WHERE (id_employee=?)';
    conn.query(query, [id_employee], (error, results)=> {
        if(error){
            next(error)
        }else{
            res.status(200).json({response:true});
        }
    })
});

//CRUD departamentos
router.get('/get-department', (req, res, next)=>{
    let query = "select * from department";

    conn.query(query, (error, results)=> {
        if(error){
            next(error)
        }else{
            res.status(200).json({response:results});
        }
    })
});

router.post('/insert_department', (req, res, next)=>{
    let {name} = req.body;
    let query = 'INSERT INTO department (name) values (?); SELECT LAST_INSERT_ID() as prevID;';

    conn.query(query, [name], (error, results)=> {
        if(error){
            next(error)
        }else{
            res.locals.lastDepID = results[1][0].prevID;
            next();
        }
    });
}, (req,res,next)=>{
    let query = 'INSERT INTO entity (id_type, name) values (?, ?);SELECT LAST_INSERT_ID() as prevID;';
    let {name} = req.body;
    let departmentType = 104;

    conn.query(query, [departmentType, name], (error, results)=> {
        if(error){
            next(error)
        }else{
            res.locals.lastEntID = results[1][0].prevID;
            next();
        }
    });
}, (req,res,next)=>{
    let query = 'INSERT INTO entity_department (id_entity, id_department) values (?, ?);';

    conn.query(query, [res.locals.lastEntID, res.locals.lastDepID], (error, results)=> {
        if(error){
            next(error)
        }else{
            res.status(200).json({response:true});
        }
    });
});

router.put('/update-department', (req, res, next)=>{
    let {idDepartment, name} = req.body;
    let query = 'UPDATE department SET name=? WHERE (idDepartment=?)';

    conn.query(query, [idDepartment, name], (error, results)=> {
        if(error){
            next(error)
        }else{
            res.status(200).json({response:true});
        }
    })
});

router.put('/delete-department', (req, res, next)=>{
    let {idDepartment} = req.body;
    let query = 'delete from department WHERE (idDepartment=?)';
    conn.query(query, [idDepartment], (error, results)=> {
        if(error){
            next(error)
        }else{
            res.status(200).json({response:true});
        }
    })
});

//CRUD entidad a departamento
router.get('/get-entity-department', (req, res, next)=>{
    let query = "select * from entity_department";

    conn.query(query, (error, results)=> {
        if(error){
            next(error)
        }else{
            res.status(200).json({response:results});
        }
    })
});

router.post('/add-entity-department', (req, res, next)=>{
    let {id_entity, id_department} = req.body;
    let query = 'INSERT INTO entity_department (id_entity, id_department) values (?, ?)';

    conn.query(query, [id_entity, id_department], (error, results)=> {
        if(error){
            next(error)
        }else{
            res.status(200).json({response:true});
        }
    });
});

router.put('/update-entity-department', (req, res, next)=>{
    let {id_entity, id_department} = req.body;
    let query = 'UPDATE entity_department SET id_entity=? WHERE (id_department=?)';

    conn.query(query, [id_entity, id_department], (error, results)=> {
        if(error){
            next(error)
        }else{
            res.status(200).json({response:true});
        }
    })
});

router.put('/delete-entity-department', (req, res, next)=>{
    let {id_entity} = req.body;
    let query = 'delete from entity_department WHERE (id_entity=?)';
    conn.query(query, [id_entity], (error, results)=> {
        if(error){
            next(error)
        }else{
            res.status(200).json({response:true});
        }
    })
});

module.exports = router