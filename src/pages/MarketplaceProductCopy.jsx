// src/pages/MarketplaceProduct.jsx
import React, { useEffect } from "react"
import {
  Box,
  Typography,
  IconButton,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material"

import ArrowBackIcon from "@mui/icons-material/ArrowBack"
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder"
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined"
import StarIcon from "@mui/icons-material/Star"
import StarHalfIcon from "@mui/icons-material/StarHalf"
import StarBorderIcon from "@mui/icons-material/StarBorder"

import { useNavigate, useParams } from "react-router-dom"
import { searchRead, addToCart, syncCartToErp } from "../../utils/api.js"

export default function MarketplaceProduct() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [product, setProduct] = React.useState(null)
  const [mainImage, setMainImage] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [addingToCart, setAddingToCart] = React.useState(false)
  const [descriptionExpanded, setDescriptionExpanded] = React.useState(false)
  const [showSeeMore, setShowSeeMore] = React.useState(false)
  const descriptionRef = React.useRef(null)
  const [cartMessage, setCartMessage] = React.useState({
    open: false,
    text: "",
    severity: "success",
  })

  React.useEffect(() => {
    if (!id) return

    let isMounted = true

    const fetchProduct = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await searchRead(
          "product.product",
          [["id", "=", parseInt(id, 10)]],
          ["id", "name", "list_price", "description", "description_sale", "website_description", "default_code", "image_512", "categ_id"], // Using image_512 for product detail page
        )

        if (!isMounted) return

        if (data.length === 0) {
          setError("Product not found")
          setProduct(null)
          return
        }

        const productData = data[0]
        
        // Extract category name from categ_id array [id, name]
        const categoryName = productData.categ_id 
          ? (Array.isArray(productData.categ_id) ? productData.categ_id[1] : productData.categ_id)
          : null
        
        // Prioritize website_description (from Website Details tab), then description_sale, then description
        let productDescription = productData.website_description || productData.description_sale || productData.description || "No description available"
        
        // Clean up HTML: remove empty table elements and orphaned table tags (common issue from Odoo exports)
        if (productDescription && typeof productDescription === 'string') {
          // Helper function to check if element has content
          const hasContent = (html) => {
            const textContent = html.replace(/<[^>]+>/g, '').trim()
            return textContent.length > 0
          }
          
          // Remove complete empty tables first
          productDescription = productDescription.replace(
            /<table[^>]*>[\s\S]*?<\/table>/gi,
            (match) => hasContent(match) ? match : ''
          )
          
          // Remove all empty table-related elements (handles orphaned tags)
          // Process in order from outer to inner elements
          productDescription = productDescription
            .replace(/<tbody[^>]*>[\s\S]*?<\/tbody>/gi, (match) => hasContent(match) ? match : '')
            .replace(/<thead[^>]*>[\s\S]*?<\/thead>/gi, (match) => hasContent(match) ? match : '')
            .replace(/<tfoot[^>]*>[\s\S]*?<\/tfoot>/gi, (match) => hasContent(match) ? match : '')
            .replace(/<tr[^>]*>[\s\S]*?<\/tr>/gi, (match) => hasContent(match) ? match : '')
            .replace(/<td[^>]*>[\s\S]*?<\/td>/gi, (match) => hasContent(match) ? match : '')
            .replace(/<th[^>]*>[\s\S]*?<\/th>/gi, (match) => hasContent(match) ? match : '')
          
          // Remove any remaining self-closing or empty table tags
          productDescription = productDescription
            .replace(/<td[^>]*\s*\/?>/gi, '')
            .replace(/<th[^>]*\s*\/?>/gi, '')
            .replace(/<tr[^>]*\s*\/?>/gi, '')
            .replace(/<tbody[^>]*\s*\/?>/gi, '')
            .replace(/<thead[^>]*\s*\/?>/gi, '')
            .replace(/<tfoot[^>]*\s*\/?>/gi, '')
          
          // Clean up any remaining empty tags or whitespace
          productDescription = productDescription
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/>\s+</g, '><') // Remove whitespace between tags
            .trim()
        }
        
        const processedProduct = {
          id: productData.id,
          name: productData.name,
          price: `₱${parseFloat(productData.list_price || 0).toFixed(2)}`,
          rating: 4.6,
          description: productDescription,
          category: categoryName || "test", // Add category
          images:
            productData.image_512 && productData.image_512 !== false
              ? [`data:image/png;base64,${productData.image_512}`]
              : [],
          fallbackImage: "https://picsum.photos/seed/product/400/400",
        }

        setProduct(processedProduct)
        setMainImage(processedProduct.images[0] || processedProduct.fallbackImage)
      } catch (err) {
        console.error(err)
        if (isMounted) {
          setError("Failed to load product")
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchProduct()

    return () => {
      isMounted = false
    }
  }, [id])

  // Check if description needs truncation (exceeds 2 lines)
  React.useEffect(() => {
    if (product && descriptionRef.current) {
      // Use setTimeout to ensure DOM is updated after dangerouslySetInnerHTML
      setTimeout(() => {
        const element = descriptionRef.current
        if (!element) return
        
        // Temporarily remove clamp to measure full height
        const originalDisplay = element.style.display
        const originalWebkitLineClamp = element.style.webkitLineClamp
        const originalOverflow = element.style.overflow
        
        element.style.display = 'block'
        element.style.webkitLineClamp = 'none'
        element.style.overflow = 'visible'
        
        const fullHeight = element.scrollHeight
        const lineHeight = parseFloat(getComputedStyle(element).lineHeight) || 20
        const twoLineHeight = lineHeight * 2.2 // Add small buffer
        
        // Restore original styles
        element.style.display = originalDisplay
        element.style.webkitLineClamp = originalWebkitLineClamp
        element.style.overflow = originalOverflow
        
        // Show "See more" if content exceeds 2 lines
        setShowSeeMore(fullHeight > twoLineHeight)
      }, 100)
    }
  }, [product])

  const handleBuy = async () => {
    if (!product) return

    try {
      await addToCart(product.id, 1)
      await syncCartToErp()
      navigate("/checkout/address")
    } catch (err) {
      console.error("Error preparing checkout:", err)
      setCartMessage({
        open: true,
        text: err.message || "Failed to prepare checkout. Please try again.",
        severity: "error",
      })
    }
  }

  const handleAddToCart = async () => {
    if (!product || addingToCart) return

    try {
      setAddingToCart(true)
      const result = await addToCart(product.id, 1)

      setCartMessage({
        open: true,
        text: `Added to cart! (${result.itemCount} item${result.itemCount !== 1 ? "s" : ""})`,
        severity: "success",
      })
    } catch (err) {
      console.error("Add to cart error:", err)
      setCartMessage({
        open: true,
        text: err.message || "Failed to add item to cart. Please try again.",
        severity: "error",
      })
    } finally {
      setAddingToCart(false)
    }
  }

  const handleCloseCartMessage = () => {
    setCartMessage((prev) => ({ ...prev, open: false }))
  }

  if (loading) {
    return (
      <Box
        sx={{
          maxWidth: 375,
          mx: "auto",
          px: 2,
          pt: 3,
          pb: 9,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "50vh",
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  if (error || !product) {
    return (
      <Box
        sx={{
          maxWidth: 375,
          mx: "auto",
          px: 2,
          pt: 3,
          pb: 9,
        }}
      >
        <IconButton onClick={() => navigate("/marketplace")}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" sx={{ mt: 2 }}>
          {error || "Product not found"}
        </Typography>
      </Box>
    )
  }

  const imageList =
    product.images && product.images.length
      ? product.images
      : [product.fallbackImage]

  const gradientBtn = {
    textTransform: "none",
    borderRadius: 1,
    fontWeight: 600,
    color: "#fff",
    background: "linear-gradient(90deg, #f15a29 0%, #1b1b6f 100%)",
    "&:hover": {
      background: "linear-gradient(90deg, #e55225 0%, #181864 100%)",
    },
  }

  return (
    <Box
      sx={{
        maxWidth: 375,
        mx: "auto",
        minHeight: "100vh",
        // pt: 5,
        pb: 10,
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      {/* MAIN SCROLLABLE CONTENT */}
      <Box>
        {/* Header row */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 2,
            mt: 1,
          }}
        >
          <IconButton onClick={() => navigate("/marketplace")}>
            <ArrowBackIcon />
          </IconButton>

          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Product Details
          </Typography>

          <IconButton onClick={() => navigate("/cart")}>
            <ShoppingBagOutlinedIcon />
          </IconButton>
        </Box>

        {/* Main image + thumbnails wrapper */}
        <Box
          sx={{
            borderRadius: 1,
            bgcolor: "#ffffff",
            p: 2,
            mb: 2,
          }}
        >
          {/* Main product image */}
          <Box
            sx={{
              width: "100%",
              borderRadius: 1,
              bgcolor: "#f7f7f7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              // mb: 1.5,
              overflow: "hidden",
            }}
          >
            <Box
              component="img"
              src={mainImage}
              alt={product.name}
              loading="eager"
              backgroundColor="white"
              sx={{
                width: "100%",
                height: 260,
                objectFit: "contain",
              }}
            />
          </Box>

          {/* Thumbnails row */}
          {imageList.length > 1 && (
            <Box
              sx={{
                display: "flex",
                gap: 1,
                overflowX: "auto",
                pb: 0.5,
                "&::-webkit-scrollbar": { display: "none" },
                scrollbarWidth: "none",
              }}
            >
              {imageList.map((img, i) => (
                <Box
                  key={i}
                  component="img"
                  src={img}
                  onClick={() => setMainImage(img)}
                  loading="lazy"
                  sx={{
                    width: 60,
                    height: 60,
                    objectFit: "cover",
                    borderRadius: 1,
                    border:
                      mainImage === img
                        ? "2px solid #f15a29"
                        : "2px solid #e0e0e0",
                    cursor: "pointer",
                    flexShrink: 0,
                    backgroundColor: "#fff",
                  }}
                />
              ))}
            </Box>
          )}
        </Box>

        {/* Category */}
        {product.category && (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {product.category}
          </Typography>
        )}

        {/* Product name */}
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 700, mt: 0.5, mb: 0.5 }}
        >
          {product.name}
        </Typography>

        {/* Rating + favourite */}
        {/* <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mt: 0.75,
            mb: 0.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            {renderStars(product.rating)}
            <Typography
              variant="body2"
              sx={{ ml: 0.5, color: "text.secondary", fontSize: 13 }}
            >
              {product.rating.toFixed(1)}
            </Typography>
          </Box>

          <IconButton size="small" sx={{ color: "#f15a29" }}>
            <FavoriteBorderIcon />
          </IconButton>
        </Box> */}

        {/* Price */}
        <Typography
          sx={{
            fontSize: 20,
            fontWeight: 700,
            color: "#f15a29",
            mb: 2,
          }}
        >
          {product.price}
        </Typography>

        {/* Description */}
        <Typography sx={{ fontWeight: 600, fontSize: 14, mb: 0.5 }}>
          Description
        </Typography>
        <Box>
          <Box
            ref={descriptionRef}
            sx={{
              color: "text.secondary",
              fontSize: 13,
              mb: showSeeMore ? 0.5 : 2,
              // Limit to 2 lines when not expanded
              ...(!descriptionExpanded && {
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }),
              "& p": {
                margin: 0,
                marginBottom: 1,
                "&:last-child": {
                  marginBottom: 0,
                },
              },
              "& table": {
                width: "100%",
                marginTop: 1,
                marginBottom: 1,
              },
            }}
            dangerouslySetInnerHTML={{ __html: product.description }}
          />
          {showSeeMore && (
            <Typography
              onClick={() => setDescriptionExpanded(!descriptionExpanded)}
              sx={{
                fontSize: 13,
                color: "gray",
                fontWeight: 600,
                cursor: "pointer",
                mb: 2,
                "&:hover": {
                  textDecoration: "underline",
                },
              }}
            >
              {descriptionExpanded ? "See less" : "See more"}
            </Typography>
          )}
        </Box>

        {/* Store card */}
        {/* <Box
          sx={{
            borderRadius: 1,
            bgcolor: "#ffffff",
            p: 2,
            mb: 8, // space above floating buttons
            border: "1px solid #f0f0f0",
          }}
        >
          <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 0.25 }}>
            Pet Store
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", fontSize: 12 }}
          >
            422 Reviews • 4.6★
          </Typography>
        </Box> */}
      </Box>

      {/* FLOATING ACTION BUTTONS */}
      <Box
        sx={{
          position: "fixed",
          left: "50%",
          bottom: 70, // just above your bottom nav
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 375,
          px: 2,
          boxSizing: "border-box",
          backdropFilter: "blur(4px)",
        }}
      >

        <Box
          sx={{
            display: "flex",
            gap: 2,
            pb: 1.25,
          }}
        >
          <Button
            fullWidth
            variant="outlined"
            onClick={handleAddToCart}
            disabled={addingToCart}
            sx={{
              textTransform: "none",
              borderRadius: 1,
              fontWeight: 600,
              borderColor: "#000000ff",
              color: "#000000ff",
            }}
          >
            {addingToCart ? <CircularProgress size={20} /> : "Add to Cart"}
          </Button>

          <Button fullWidth sx={gradientBtn} onClick={handleBuy}>
            Buy Now
          </Button>
        </Box>
      </Box>

      {/* Snackbar for cart feedback */}
      <Snackbar
        open={cartMessage.open}
        autoHideDuration={4000}
        onClose={handleCloseCartMessage}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseCartMessage}
          severity={cartMessage.severity}
          sx={{ width: "100%" }}
        >
          {cartMessage.text}
        </Alert>
      </Snackbar>
    </Box>
  )
}

/* Helpers */

function renderStars(rating) {
  const stars = []
  const full = Math.floor(rating)
  const hasHalf = rating - full >= 0.5

  for (let i = 0; i < full; i++) {
    stars.push(
      <StarIcon
        key={`full-${i}`}
        sx={{ fontSize: 18, color: "#FFA000" }}
      />,
    )
  }

  if (hasHalf) {
    stars.push(
      <StarHalfIcon
        key="half"
        sx={{ fontSize: 18, color: "#FFA000" }}
      />,
    )
  }

  while (stars.length < 5) {
    stars.push(
      <StarBorderIcon
        key={`empty-${stars.length}`}
        sx={{ fontSize: 18, color: "#FFA000" }}
      />,
    )
  }

  return <>{stars}</>
}