import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { ProductsQueryDto } from './dtos/products-query.dto';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';
import { UploadProductImageDto } from './dtos/upload-product-image.dto';
import { PERMISSIONS } from '../common/constants/permissions';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.PRODUCT_VIEW)
  @ApiOperation({ summary: 'List all products with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of products' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    description: 'Items per page',
  })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort field' })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order: asc or desc',
  })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ProductsQueryDto,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    return this.productsService.findAll(user.tenant_id, {
      search: query.search,
      category: query.category,
      status: query.status,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      sortBy,
      sortOrder: sortOrder as 'asc' | 'desc' | undefined,
    });
  }

  @Get('export/csv')
  @RequirePermission(PERMISSIONS.PRODUCT_VIEW)
  @ApiOperation({ summary: 'Export products as CSV' })
  @ApiResponse({ status: 200, description: 'CSV file download' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async exportCsv(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ProductsQueryDto,
    @Res() res: Response,
  ) {
    const csv = await this.productsService.exportCsv(user.tenant_id, {
      search: query.search,
      category: query.category,
      status: query.status,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="products-export.csv"',
    );

    return res.send(csv);
  }

  @Get('categories')
  @RequirePermission(PERMISSIONS.PRODUCT_VIEW)
  @ApiOperation({ summary: 'Get all product categories' })
  @ApiResponse({ status: 200, description: 'List of product categories' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  getCategories(@CurrentUser() user: AuthenticatedUser) {
    return this.productsService.getCategories(user.tenant_id);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.PRODUCT_VIEW)
  @ApiOperation({ summary: 'Get a single product by ID' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Product details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.productsService.findOne(id, user.tenant_id);
  }

  @Post()
  @RequirePermission(PERMISSIONS.PRODUCT_CREATE)
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateProductDto,
  ) {
    return this.productsService.create(user.tenant_id, body);
  }

  @Put(':id')
  @RequirePermission(PERMISSIONS.PRODUCT_EDIT)
  @ApiOperation({ summary: 'Update an existing product' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateProductDto,
  ) {
    return this.productsService.update(id, user.tenant_id, body);
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.PRODUCT_DELETE)
  @ApiOperation({ summary: 'Delete a product (soft or force)' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiQuery({
    name: 'forceDelete',
    required: false,
    description: 'Permanently delete (admin only)',
  })
  @ApiResponse({ status: 200, description: 'Product deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  remove(
    @Param('id') id: string,
    @Query('forceDelete') forceDelete: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (forceDelete === 'true') {
      if (user.role !== 'admin') {
        throw new ForbiddenException(
          'Only admin users can permanently delete records',
        );
      }
      return this.productsService.forceDelete(id, user.tenant_id);
    }
    return this.productsService.remove(id, user.tenant_id);
  }

  @Post(':id/upload-image')
  @RequirePermission(PERMISSIONS.PRODUCT_EDIT)
  @ApiOperation({ summary: 'Upload a product image' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Image uploaded successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  uploadImage(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UploadProductImageDto,
  ) {
    return this.productsService.uploadImage(id, user.tenant_id, body.image_url);
  }
}
