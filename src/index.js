const express = require("express");
const { v4: uuidv4 } = require("uuid");

const app = express();

app.use(express.json());

const customers = [];

// Middleware
function verifyIfCpfExists(req, res, next) {
  const { cpf } = req.headers;

  const customer = customers.find((customer) => customer.cpf === cpf);

  if (!customer) return res.status(404).json({ error: "Customer not found" });

  req.customer = customer;

  next();
}

// função para recuperar saldo do usuário (CPF), será usada na rota /withdraw (POST)
function getBalance(statement) {
  return statement.reduce((acc, operation) => {
    if (operation.type === "credit") acc += operation.amount;
    else acc -= operation.amount;
    return acc;
  }, 0);
}

//app.use(verifyIfCpfExists);

app.post("/account", (req, res) => {
  const { cpf, name } = req.body;

  const customerAlreadyExists = customers.some(
    (customer) => customer.cpf === cpf
  );

  if (customerAlreadyExists)
    return res.status(400).json({ error: "Customer already exists" });

  customers.push({
    cpf,
    name,
    id: uuidv4(),
    statement: [],
  });

  console.log(customers);

  res.status(201).send({ msg: "Created successfully" });
});

app.post("/deposit", verifyIfCpfExists, (req, res) => {
  const { description, amount } = req.body;
  const { customer } = req;

  const statementOperation = {
    description,
    amount,
    created_at: new Date(),
    type: "credit",
  };

  customer.statement.push(statementOperation);

  res.status(201).send();
});

app.post("/withdraw", verifyIfCpfExists, (req, res) => {
  const { amount } = req.body;
  const { customer } = req;

  const balance = getBalance(customer.statement);

  if (balance < amount)
    return res.status(400).json({ error: "Insufficient account balance" });

  const statementOperation = {
    amount,
    created_at: new Date(),
    type: "debit",
  };

  customer.statement.push(statementOperation);

  res.status(201).send();
});

app.get("/statement", verifyIfCpfExists, (req, res) => {
  const { customer } = req;

  res.json(customer.statement);
});

app.get("/statement/date", verifyIfCpfExists, (req, res) => {
  const { customer } = req;
  const { date } = req.query;

  const dateFormat = new Date(date + " 00:00");

  const statement = customer.statement.filter(
    (statement) =>
      statement.created_at.toDateString() ===
      new Date(dateFormat).toDateString()
  );

  res.json(statement);
});

app.put("/account", (req, res) => {
  const { name } = req.body;
  const { customer } = req;

  customer.name = name;

  res.status(201).send();
});

app.get("/account", verifyIfCpfExists, (req, res) => {
  const { customer } = req;
  res.json(customer);
});

app.get("/balance", verifyIfCpfExists, (req, res) => {
  const { customer } = req;

  res.json(getBalance(customer.statement));
});

app.delete("/account", verifyIfCpfExists, (req, res) => {
  const { customer } = req;

  customers.splice(customer, 1);

  res.status(200).json(customers);
});

app.listen(3000);
