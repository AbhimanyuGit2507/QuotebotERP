import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { ProductsQueryDto } from './dtos/products-query.dto';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';
import { UploadProductImageDto } from './dtos/upload-product-image.dto';

@ApiTags('Products')
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
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
  getCategories(@CurrentUser() user: AuthenticatedUser) {
    return this.productsService.getCategories(user.tenant_id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.productsService.findOne(id, user.tenant_id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateProductDto,
  ) {
    return this.productsService.create(user.tenant_id, body);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateProductDto,
  ) {
    return this.productsService.update(id, user.tenant_id, body);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Query('forceDelete') forceDelete: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (forceDelete === 'true') {
      return this.productsService.forceDelete(id, user.tenant_id);
    }
    return this.productsService.remove(id, user.tenant_id);
  }

  @Post(':id/upload-image')
  uploadImage(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UploadProductImageDto,
  ) {
    return this.productsService.uploadImage(id, user.tenant_id, body.image_url);
  }
}
