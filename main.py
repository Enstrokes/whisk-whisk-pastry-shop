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
    email: EmailStr
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
    """Convert MongoDB document _id to string"""
    if not doc:
        return doc
    if "_id" in doc and isinstance(doc["_id"], ObjectId):
        doc["_id"] = str(doc["_id"])
    return doc


def serialize_list(docs):
    """Convert a list of MongoDB documents"""
    return [serialize_doc(doc) for doc in docs]
# Customers
@app.get("/api/customers", response_model=List[Customer])
async def get_customers(current_user: Annotated[User, Depends(get_current_user)]):
    customers = await db.customers.find().to_list(100)
    return serialize_list(customers)


# Stock Items
@app.get("/api/stock_items", response_model=List[StockItem])
async def get_stock_items(current_user: Annotated[User, Depends(get_current_user)]):
    stock_items = await db.stock_items.find().to_list(100)
    return serialize_list(stock_items)


# Recipes
@app.get("/api/recipes", response_model=List[Recipe])
async def get_recipes(current_user: Annotated[User, Depends(get_current_user)]):
    recipes = await db.recipes.find().to_list(100)
    return serialize_list(recipes)


# Invoices
@app.get("/api/invoices", response_model=List[Invoice])
async def get_invoices(current_user: Annotated[User, Depends(get_current_user)]):
    invoices = await db.invoices.find().to_list(100)
    return serialize_list(invoices)
