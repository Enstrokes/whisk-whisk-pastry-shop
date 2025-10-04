## Record a stock purchase (add quantity and recalculate cost per unit)

# Place this endpoint after all models and app definition
import os
from datetime import datetime, timedelta
from typing import List, Optional, Annotated

from bson import ObjectId
from fastapi import FastAPI, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, Field, EmailStr
from pydantic import GetCoreSchemaHandler
from pydantic_core import core_schema
from motor.motor_asyncio import AsyncIOMotorClient

# --- CONFIGURATION ---
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
SECRET_KEY = "a_very_secret_key_for_whisk_and_whisk"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# --- BCRYPT CONTEXT ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- OAUTH2 SCHEME ---
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/token")

# --- DATABASE CONNECTION ---
client = AsyncIOMotorClient(MONGO_URI)
db = client.whisk_and_whisk_db


# --- HELPERS ---
class PyObjectId(ObjectId):
    """Custom Pydantic-compatible ObjectId for MongoDB"""

    @classmethod
    def __get_pydantic_core_schema__(cls, _source_type, _handler: GetCoreSchemaHandler):
        return core_schema.no_info_after_validator_function(
            cls.validate, core_schema.str_schema()
        )

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, schema, handler):
        schema = handler(schema)
        schema.update(type="string")
        return schema


class BaseDBModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


# --- MODELS ---
class User(BaseDBModel):
    email: EmailStr


class UserInDB(User):
    hashed_password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


class Customer(BaseDBModel):
    name: str
    email: Optional[str] = None
    phone: str
    address: str
    birthday: str
    anniversary: Optional[str] = None


class StockItem(BaseDBModel):
    name: str
    category: str
    quantity: float
    unit: str
    costPerUnit: float
    lowStockThreshold: float
    sellingPrice: Optional[float] = None


class StockPurchase(BaseModel):
    quantity_added: float
    cost_per_unit_of_purchase: float


class RecipeIngredient(BaseModel):
    stockItemId: str
    quantity: float


class Recipe(BaseDBModel):
    name: str
    ingredients: List[RecipeIngredient]
    sellingPrice: float


class InvoiceItem(BaseModel):
    productId: str
    productName: str
    quantity: int
    price: float
    discount: float
    gst: float


class Invoice(BaseDBModel):
    invoiceNumber: str
    customerId: str
    customerName: str
    date: str
    items: List[InvoiceItem]
    subtotal: float
    discount: float
    gst: float
    total: float
    paymentStatus: str
    orderType: str
    notes: Optional[str] = None
    amountPaid: float


# --- FASTAPI APP ---
app = FastAPI(title="Whisk & Whisk Pastry Shop API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- AUTH HELPERS ---
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception

    user = await db.users.find_one({"email": token_data.email})
    if user is None:
        raise credentials_exception
    return user


# --- SEED DATABASE ---
async def seed_database():
    if await db.users.count_documents({}) == 0:
        hashed_password = get_password_hash("password")
        await db.users.insert_one(
            {"email": "admin@whiskandwhisk.com", "hashed_password": hashed_password}
        )

        customers_data = [
            {
                "name": "Arun Kumar",
                "email": "arun@example.com",
                "phone": "9876543210",
                "address": "123 Anna Nagar, Chennai",
                "birthday": "1990-08-15",
                "anniversary": "2015-11-20",
            },
            {
                "name": "Priya Sharma",
                "email": "priya@example.com",
                "phone": "9123456780",
                "address": "456 T Nagar, Chennai",
                "birthday": "1992-04-22",
            },
        ]
        await db.customers.insert_many(customers_data)

        stock_data = [
            {
                "name": "Flour",
                "category": "Ingredient",
                "quantity": 50,
                "unit": "kg",
                "costPerUnit": 40,
                "lowStockThreshold": 10,
            },
            {
                "name": "Sugar",
                "category": "Ingredient",
                "quantity": 40,
                "unit": "kg",
                "costPerUnit": 55,
                "lowStockThreshold": 5,
            },
            {
                "name": "Butter",
                "category": "Ingredient",
                "quantity": 20,
                "unit": "kg",
                "costPerUnit": 500,
                "lowStockThreshold": 4,
            },
            {
                "name": "Croissant",
                "category": "Finished Product",
                "quantity": 50,
                "unit": "pcs",
                "costPerUnit": 25,
                "lowStockThreshold": 10,
                "sellingPrice": 75,
            },
            {
                "name": "Chocolate Cake (1kg)",
                "category": "Finished Product",
                "quantity": 10,
                "unit": "pcs",
                "costPerUnit": 400,
                "lowStockThreshold": 3,
                "sellingPrice": 850,
            },
            {
                "name": "Cake Box (1kg)",
                "category": "Packaging",
                "quantity": 100,
                "unit": "pcs",
                "costPerUnit": 15,
                "lowStockThreshold": 20,
            },
        ]
        await db.stock_items.insert_many(stock_data)


@app.on_event("startup")
async def startup_event():
    await seed_database()


# --- ROUTES ---
@app.get("/")
def read_root():
    return {"message": "Welcome to Whisk & Whisk Pastry Shop API"}


@app.post("/api/token", response_model=Token)
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()]
):
    user = await db.users.find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


# --- SERIALIZATION HELPERS ---
def serialize_doc(doc):
    """Convert MongoDB document _id to string and ensure all customer fields are present as strings"""
    if not doc:
        return doc
    if "_id" in doc and isinstance(doc["_id"], ObjectId):
        doc["_id"] = str(doc["_id"])
    # Ensure all customer fields are present as strings for frontend editing
    if "name" in doc:
        doc["name"] = doc.get("name", "") or ""
        doc["email"] = doc.get("email", "") or ""
        doc["phone"] = doc.get("phone", "") or ""
        doc["address"] = doc.get("address", "") or ""
        doc["birthday"] = doc.get("birthday", "") or ""
        doc["anniversary"] = doc.get("anniversary", "") or ""
    return doc


def serialize_list(docs):
    """Convert a list of MongoDB documents"""
    return [serialize_doc(doc) for doc in docs]

# Customers
from fastapi import Query
from fastapi.responses import JSONResponse

@app.get("/api/customers")
async def get_customers(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    current_user: Annotated[User, Depends(get_current_user)] = None
):
    total = await db.customers.count_documents({})
    customers = await db.customers.find().skip(skip).limit(limit).to_list(length=limit)
    return JSONResponse({
        "results": serialize_list(customers),
        "total": total
    })

# Get a single customer by ID
@app.get("/api/customers/{customer_id}", response_model=Customer)
async def get_customer(customer_id: str, current_user: Annotated[User, Depends(get_current_user)]):
    customer = await db.customers.find_one({"_id": ObjectId(customer_id)})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return serialize_doc(customer)


# Stock Items

# Create Stock Item
from fastapi import Body, Query

@app.post("/api/stock_items", response_model=StockItem)
async def create_stock_item(
    item: StockItem = Body(...),
    current_user: Annotated[User, Depends(get_current_user)] = None
):
    item_dict = item.dict(exclude_unset=True)
    item_dict.pop("id", None)  # Remove id if present
    result = await db.stock_items.insert_one(item_dict)
    created = await db.stock_items.find_one({"_id": result.inserted_id})
    return serialize_doc(created)

# Update Stock Item
@app.delete("/api/stock_items/{item_id}")
async def delete_stock_item(
    item_id: str,
    current_user: Annotated[User, Depends(get_current_user)] = None
):
    result = await db.stock_items.delete_one({"_id": ObjectId(item_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Stock item not found")
    return {"detail": "Stock item deleted"}
from fastapi import Path

@app.put("/api/stock_items/{item_id}", response_model=StockItem)
async def update_stock_item(
    item_id: str = Path(...),
    item: StockItem = Body(...),
    current_user: Annotated[User, Depends(get_current_user)] = None
):
    item_dict = item.dict(exclude_unset=True)
    item_dict.pop("id", None)
    result = await db.stock_items.update_one({"_id": ObjectId(item_id)}, {"$set": item_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Stock item not found")
    updated = await db.stock_items.find_one({"_id": ObjectId(item_id)})
    return serialize_doc(updated)


# Paginated and searchable stock items endpoint
# Add a public endpoint for stock items (without auth requirement)
@app.get("/api/stock_items_public")
async def get_stock_items_public(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1),
    search: str = "",
    category: str = "",
    status: str = ""
):
    query = {}
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    if category:
        query["category"] = category
    # Optionally, add status filter logic here if needed
    total = await db.stock_items.count_documents(query)
    cursor = db.stock_items.find(query).skip(skip).limit(limit)
    items = await cursor.to_list(length=limit)
    return {"results": serialize_list(items), "total": total}


@app.get("/api/stock_items")
async def get_stock_items(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1),
    search: str = "",
    category: str = "",
    status: str = "",
    current_user: Annotated[User, Depends(get_current_user)] = None
):
    query = {}
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    if category:
        query["category"] = category
    # Optionally, add status filter logic here if needed
    total = await db.stock_items.count_documents(query)
    cursor = db.stock_items.find(query).skip(skip).limit(limit)
    items = await cursor.to_list(length=limit)
    return {"results": serialize_list(items), "total": total}



# Recipes CRUD

# Paginated and searchable recipes endpoint
@app.get("/api/recipes")
async def get_recipes(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1),
    search: str = "",
    current_user: Annotated[User, Depends(get_current_user)] = None
):
    query = {}
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    total = await db.recipes.count_documents(query)
    cursor = db.recipes.find(query).skip(skip).limit(limit)
    items = await cursor.to_list(length=limit)
    return {"results": serialize_list(items), "total": total}

@app.post("/api/recipes", response_model=Recipe)
async def create_recipe(
    recipe: Recipe = Body(...),
    current_user: Annotated[User, Depends(get_current_user)] = None
):
    recipe_dict = recipe.dict(exclude_unset=True)
    recipe_dict.pop("id", None)
    result = await db.recipes.insert_one(recipe_dict)
    created = await db.recipes.find_one({"_id": result.inserted_id})
    return serialize_doc(created)

@app.put("/api/recipes/{recipe_id}", response_model=Recipe)
async def update_recipe(
    recipe_id: str,
    recipe: Recipe = Body(...),
    current_user: Annotated[User, Depends(get_current_user)] = None
):
    recipe_dict = recipe.dict(exclude_unset=True)
    recipe_dict.pop("id", None)
    result = await db.recipes.update_one({"_id": ObjectId(recipe_id)}, {"$set": recipe_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Recipe not found")
    updated = await db.recipes.find_one({"_id": ObjectId(recipe_id)})
    return serialize_doc(updated)

@app.delete("/api/recipes/{recipe_id}")
async def delete_recipe(
    recipe_id: str,
    current_user: Annotated[User, Depends(get_current_user)] = None
):
    if not recipe_id or recipe_id == "undefined":
        raise HTTPException(status_code=400, detail="Invalid recipe id")
    try:
        obj_id = ObjectId(recipe_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid recipe id format")
    result = await db.recipes.delete_one({"_id": obj_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return {"detail": "Recipe deleted"}



# Invoices
from fastapi import Query
from fastapi.responses import JSONResponse

@app.get("/api/invoices")
async def get_invoices(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    current_user: Annotated[User, Depends(get_current_user)] = None
):
    total = await db.invoices.count_documents({})
    invoices = await db.invoices.find().sort("date", -1).skip(skip).limit(limit).to_list(length=limit)
    return JSONResponse({
        "results": serialize_list(invoices),
        "total": total
    })


# --- INVOICE CREATION ENDPOINT ---
from fastapi import Body

class InvoiceCreate(BaseModel):
    customerId: Optional[str] = None
    customerName: Optional[str] = None
    customerEmail: Optional[str] = None  # optional, now allows empty or invalid emails
    customerPhone: Optional[str] = None
    customerAddress: Optional[str] = None  # optional
    customerBirthday: Optional[str] = None  # optional
    customerAnniversary: Optional[str] = None  # optional
    date: str
    items: List[InvoiceItem]
    subtotal: float
    discount: float
    gst: float
    total: float
    paymentStatus: str
    orderType: str
    notes: Optional[str] = None
    amountPaid: float

@app.post("/api/invoices", response_model=Invoice)
async def create_invoice(
    invoice: InvoiceCreate = Body(...),
    current_user: Annotated[User, Depends(get_current_user)] = None
):
    # Handle customer: use existing or create new
    if invoice.customerId:
        customer = await db.customers.find_one({"_id": ObjectId(invoice.customerId)})
        if not customer:
            raise HTTPException(status_code=400, detail="Customer not found")
        customerId = str(customer["_id"])
        customerName = customer["name"]
    else:
        # Create new customer
        # Try both customerPhone and phone for compatibility
        phone = invoice.customerPhone or getattr(invoice, 'phone', None)
        if not (invoice.customerName and phone):
            raise HTTPException(status_code=400, detail="Missing new customer details (name and phone required)")
        new_customer = {
            "name": invoice.customerName,
            "email": invoice.customerEmail or "",
            "phone": phone,
            "address": invoice.customerAddress or "",
            "birthday": invoice.customerBirthday or "",
            "anniversary": invoice.customerAnniversary or "",
        }
        result = await db.customers.insert_one(new_customer)
        customerId = str(result.inserted_id)
        customerName = invoice.customerName

    # Generate next invoice number (sequential, e.g., WHISK-01)
    last_invoice = await db.invoices.find().sort("_id", -1).limit(1).to_list(1)
    if last_invoice and "invoiceNumber" in last_invoice[0]:
        try:
            last_num = int(last_invoice[0]["invoiceNumber"].split("-")[-1])
        except Exception:
            last_num = 0
    else:
        last_num = 0
    next_num = last_num + 1
    invoice_number = f"WHISK-{next_num:02d}"
    invoice_doc = {
        "invoiceNumber": invoice_number,
        "customerId": customerId,
        "customerName": customerName,
        "date": invoice.date,
        "items": [item.dict() for item in invoice.items],
        "subtotal": invoice.subtotal,
        "discount": invoice.discount,
        "gst": invoice.gst,
        "total": invoice.total,
        "paymentStatus": invoice.paymentStatus,
        "orderType": invoice.orderType,
        "notes": invoice.notes,
        "amountPaid": invoice.amountPaid,
    }
    result = await db.invoices.insert_one(invoice_doc)
    saved_invoice = await db.invoices.find_one({"_id": result.inserted_id})
    return serialize_doc(saved_invoice)


# --- INVOICE UPDATE ENDPOINT ---
from fastapi import Path

@app.put("/api/invoices/{invoice_id}", response_model=Invoice)
async def update_invoice(
    invoice_id: str = Path(...),
    invoice: InvoiceCreate = Body(...),
    current_user: Annotated[User, Depends(get_current_user)] = None
):
    # Handle customer: use existing or create new
    if invoice.customerId:
        customer = await db.customers.find_one({"_id": ObjectId(invoice.customerId)})
        if not customer:
            raise HTTPException(status_code=400, detail="Customer not found")
        customerId = str(customer["_id"])
        customerName = customer["name"]
    else:
        phone = invoice.customerPhone or getattr(invoice, 'phone', None)
        if not (invoice.customerName and phone):
            raise HTTPException(status_code=400, detail="Missing new customer details (name and phone required)")
        new_customer = {
            "name": invoice.customerName,
            "email": invoice.customerEmail or "",
            "phone": phone,
            "address": invoice.customerAddress or "",
            "birthday": invoice.customerBirthday or "",
            "anniversary": invoice.customerAnniversary or "",
        }
        result = await db.customers.insert_one(new_customer)
        customerId = str(result.inserted_id)
        customerName = invoice.customerName

    # Preserve existing invoiceNumber
    existing = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    invoice_number = existing.get("invoiceNumber", "") if existing else ""
    invoice_doc = {
        "invoiceNumber": invoice_number,
        "customerId": customerId,
        "customerName": customerName,
        "date": invoice.date,
        "items": [item.dict() for item in invoice.items],
        "subtotal": invoice.subtotal,
        "discount": invoice.discount,
        "gst": invoice.gst,
        "total": invoice.total,
        "paymentStatus": invoice.paymentStatus,
        "orderType": invoice.orderType,
        "notes": invoice.notes,
        "amountPaid": invoice.amountPaid,
    }
    result = await db.invoices.update_one({"_id": ObjectId(invoice_id)}, {"$set": invoice_doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    updated_invoice = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    return serialize_doc(updated_invoice)

# Record a stock purchase (add quantity and recalculate cost per unit)
@app.post("/api/stock_items/{item_id}/purchases", response_model=StockItem)
async def record_stock_purchase(
    item_id: str,
    purchase: StockPurchase = Body(...),
    current_user: Annotated[User, Depends(get_current_user)] = None
):
    item = await db.stock_items.find_one({"_id": ObjectId(item_id)})
    if not item:
        raise HTTPException(status_code=404, detail="Stock item not found")
    # Calculate new quantity
    old_qty = item.get("quantity", 0)
    old_cost = item.get("costPerUnit", 0)
    add_qty = purchase.quantity_added
    new_cost = purchase.cost_per_unit_of_purchase
    # Weighted average cost calculation
    if add_qty > 0:
        total_qty = old_qty + add_qty
        avg_cost = ((old_qty * old_cost) + (add_qty * new_cost)) / total_qty if total_qty > 0 else new_cost
    else:
        total_qty = old_qty
        avg_cost = old_cost
    await db.stock_items.update_one(
        {"_id": ObjectId(item_id)},
        {"$set": {"quantity": total_qty, "costPerUnit": avg_cost}}
    )
    updated = await db.stock_items.find_one({"_id": ObjectId(item_id)})
    return serialize_doc(updated)
